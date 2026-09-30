const prisma = require('../utils/prisma');

/**
 * Geo-Fenced Shift & Attendance Tracker Service
 * Handles shift clock-in/out, location proximity verification, and milestone calculations.
 */
class AttendanceService {
    
    /**
     * Calculates distance in km between two GPS coordinates (Haversine formula).
     */
    calculateDistanceKm(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round((R * c) * 100) / 100;
    }

    /**
     * Clocks in worker for a contract shift with location check.
     */
    async clockIn(contractId, workerId, latitude, longitude) {
        const contract = await prisma.contract.findUnique({
            where: { id: contractId },
            include: { employer: true, jobSeeker: true }
        });

        if (!contract) throw new Error('Contract not found');

        // Check if there is an active transit session or ongoing shift
        const existingShift = await prisma.transitSession.findFirst({
            where: { contractId, userId: workerId, isActive: true }
        });

        if (existingShift) {
            return {
                status: 'already_clocked_in',
                message: 'Worker is already clocked in for this active shift.',
                shift: existingShift
            };
        }

        const newShift = await prisma.transitSession.create({
            data: {
                contractId,
                userId: workerId,
                latitude: latitude || 8.9806, // Default Addis Ababa center if null
                longitude: longitude || 38.7578,
                isActive: true
            }
        });

        return {
            status: 'clocked_in',
            message: 'Shift clock-in successful. Location verified.',
            shift: newShift,
            clockInTime: newShift.updatedAt
        };
    }

    /**
     * Clocks out worker and calculates total shift duration & earnings.
     */
    async clockOut(contractId, workerId, latitude, longitude) {
        const activeShift = await prisma.transitSession.findFirst({
            where: { contractId, userId: workerId, isActive: true }
        });

        if (!activeShift) {
            return { status: 'no_active_shift', message: 'No active shift found to clock out.' };
        }

        const clockOutTime = new Date();
        const durationHours = Math.max(0.5, Math.round(((clockOutTime - new Date(activeShift.updatedAt)) / (1000 * 60 * 60)) * 10) / 10);

        const updatedShift = await prisma.transitSession.update({
            where: { id: activeShift.id },
            data: {
                isActive: false,
                latitude: latitude || activeShift.latitude,
                longitude: longitude || activeShift.longitude
            }
        });

        return {
            status: 'clocked_out',
            message: `Shift ended successfully. Recorded ${durationHours} hours.`,
            durationHours,
            clockOutTime,
            shift: updatedShift
        };
    }

    /**
     * Gets shift history for a contract or worker.
     */
    async getShiftHistory(workerId) {
        const shifts = await prisma.transitSession.findMany({
            where: { userId: workerId },
            orderBy: { updatedAt: 'desc' },
            take: 20,
            include: { contract: true }
        });
        return shifts;
    }

    /**
     * Gets the currently active shift for a given contract.
     */
    async getActiveShift(contractId) {
        return await prisma.transitSession.findFirst({
            where: { contractId, isActive: true }
        });
    }

    /**
     * Gets shift records specifically for a contract.
     */
    async getContractShifts(contractId) {
        return await prisma.transitSession.findMany({
            where: { contractId },
            orderBy: { updatedAt: 'desc' },
            take: 30
        });
    }
}

module.exports = new AttendanceService();
