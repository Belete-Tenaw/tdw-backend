const prisma = require('../utils/prisma');

/**
 * 📦 Voluntary Household Onboarding & Mutual Appliance Checklist Service
 * Protects employers and domestic workers from false property damage claims and wage disputes.
 */
class HouseholdChecklistService {

    getDefaultInventoryItems() {
        return [
            { id: 'item_1', name: 'Automatic Washing Machine', amharicName: 'አውቶማቲክ ልብስ ማጠቢያ ማሽን', category: 'APPLIANCE', condition: 'GOOD', notes: 'Working properly', photoUrl: null },
            { id: 'item_2', name: 'Gas / Electric Stove & Oven', amharicName: 'የጋዝ / ኤሌክትሪክ ምድጃ', category: 'APPLIANCE', condition: 'GOOD', notes: 'All burners functional', photoUrl: null },
            { id: 'item_3', name: 'Refrigerator & Freezer', amharicName: 'ፍሪጅ እና ማቀዝቀዣ', category: 'APPLIANCE', condition: 'GOOD', notes: 'Cooling normally', photoUrl: null },
            { id: 'item_4', name: 'Microwave Oven', amharicName: 'ማይክሮዌቭ', category: 'APPLIANCE', condition: 'GOOD', notes: 'Clean and working', photoUrl: null },
            { id: 'item_5', name: 'Living Room Furniture & Rugs', amharicName: 'የሳሎን ሶፋ እና ምንጣፍ', category: 'FURNITURE', condition: 'GOOD', notes: 'No major tears', photoUrl: null },
            { id: 'item_6', name: 'Television & Remote', amharicName: 'ቴሌቪዥን እና ሪሞት', category: 'ELECTRONICS', condition: 'GOOD', notes: 'Screen intact', photoUrl: null },
            { id: 'item_7', name: 'Kitchen Cookware & Blender', amharicName: 'የወጥ ቤት እቃዎች እና ፈጭ', category: 'KITCHEN', condition: 'GOOD', notes: 'Standard set', photoUrl: null }
        ];
    }

    async getChecklistByContract(contractId) {
        if (!contractId) throw new Error('Contract ID is required.');

        let checklist = await prisma.householdChecklist.findUnique({
            where: { contractId },
            include: {
                contract: {
                    select: {
                        id: true,
                        employerId: true,
                        jobSeekerId: true,
                        employer: { select: { fullName: true, phone: true } },
                        jobSeeker: { select: { fullName: true, phone: true } }
                    }
                }
            }
        });

        if (!checklist) {
            // Auto-initialize standard default checklist
            const defaultItems = this.getDefaultInventoryItems();
            checklist = await prisma.householdChecklist.create({
                data: {
                    contractId,
                    items: defaultItems
                },
                include: {
                    contract: {
                        select: {
                            id: true,
                            employerId: true,
                            jobSeekerId: true,
                            employer: { select: { fullName: true, phone: true } },
                            jobSeeker: { select: { fullName: true, phone: true } }
                        }
                    }
                }
            });
        }

        const isMutuallySigned = checklist.employerSigned && checklist.workerSigned;

        return {
            ...checklist,
            isMutuallySigned,
            status: isMutuallySigned
                ? (checklist.departureCleared ? 'DEPARTURE_CLEARED' : 'MUTUALLY_PROTECTED')
                : (checklist.employerSigned || checklist.workerSigned ? 'AWAITING_COUNTER_SIGN' : 'DRAFT')
        };
    }

    async saveOrUpdateChecklist(contractId, userId, userRole, items = []) {
        if (!contractId) throw new Error('Contract ID is required.');

        const contract = await prisma.contract.findUnique({ where: { id: contractId } });
        if (!contract) throw new Error('Contract not found');

        const isEmployer = userRole === 'EMPLOYER' || contract.employerId === userId;
        const isSeeker = userRole === 'JOB_SEEKER' || contract.jobSeekerId === userId;

        if (!isEmployer && !isSeeker) {
            throw new Error('You are not authorized to update this contract checklist.');
        }

        const existing = await prisma.householdChecklist.findUnique({ where: { contractId } });

        const dataToUpdate = {
            items: items && items.length > 0 ? items : this.getDefaultInventoryItems(),
            ...(isEmployer ? { employerSigned: true, employerSignedAt: new Date() } : {}),
            ...(isSeeker ? { workerSigned: true, workerSignedAt: new Date() } : {})
        };

        let checklist;
        if (existing) {
            checklist = await prisma.householdChecklist.update({
                where: { contractId },
                data: dataToUpdate
            });
        } else {
            checklist = await prisma.householdChecklist.create({
                data: {
                    contractId,
                    ...dataToUpdate
                }
            });
        }

        return this.getChecklistByContract(contractId);
    }

    async signChecklist(contractId, userId, userRole) {
        const contract = await prisma.contract.findUnique({
            where: { id: contractId },
            include: { employer: true, jobSeeker: true }
        });
        if (!contract) throw new Error('Contract not found');

        const isEmployer = userRole === 'EMPLOYER' || contract.employerId === userId;
        const isSeeker = userRole === 'JOB_SEEKER' || contract.jobSeekerId === userId;

        if (!isEmployer && !isSeeker) {
            throw new Error('Not authorized to sign this checklist.');
        }

        const updateData = isEmployer
            ? { employerSigned: true, employerSignedAt: new Date() }
            : { workerSigned: true, workerSignedAt: new Date() };

        const checklist = await prisma.householdChecklist.update({
            where: { contractId },
            data: updateData
        });

        // If both parties have now signed, award +15 Trust points to both!
        if (checklist.employerSigned && checklist.workerSigned) {
            await prisma.jobSeeker.update({
                where: { id: contract.jobSeekerId },
                data: {
                    rewardPoints: (contract.jobSeeker.rewardPoints || 0) + 15,
                    behaviorScore: Math.min((contract.jobSeeker.behaviorScore || 50) + 5, 100)
                }
            });

            await prisma.auditLog.create({
                data: {
                    jobSeekerId: contract.jobSeekerId,
                    employerId: contract.employerId,
                    action: 'HOUSEHOLD_CHECKLIST_MUTUALLY_SIGNED',
                    details: {
                        contractId,
                        rewardPointsAwarded: 15,
                        timestamp: new Date()
                    }
                }
            });
        }

        return this.getChecklistByContract(contractId);
    }

    async signDepartureClearance(contractId, userId, userRole) {
        const contract = await prisma.contract.findUnique({ where: { id: contractId } });
        if (!contract) throw new Error('Contract not found');

        const isEmployer = userRole === 'EMPLOYER' || contract.employerId === userId;
        if (!isEmployer) {
            throw new Error('Only the employer can initiate final departure property clearance.');
        }

        const checklist = await prisma.householdChecklist.update({
            where: { contractId },
            data: {
                departureCleared: true,
                departureClearedAt: new Date()
            }
        });

        await prisma.auditLog.create({
            data: {
                jobSeekerId: contract.jobSeekerId,
                employerId: contract.employerId,
                action: 'HOUSEHOLD_DEPARTURE_CLEARANCE_SIGNED',
                details: {
                    contractId,
                    status: 'CLEARED_NO_DISPUTES',
                    timestamp: new Date()
                }
            }
        });

        return this.getChecklistByContract(contractId);
    }
}

module.exports = new HouseholdChecklistService();
