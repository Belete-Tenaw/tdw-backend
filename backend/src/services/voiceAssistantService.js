/**
 * Voice & Multilingual AI Assistant Service (5 Languages)
 * Supports audio bio transcription analysis & voice prompts for:
 * 1. English (en)
 * 2. Amharic (am)
 * 3. Afaan Oromo (om)
 * 4. Tigrinya (ti)
 * 5. Somali / Sumaligna (so)
 */
class VoiceAssistantService {
    
    /**
     * Prepares voice guidance prompts across 5 Ethiopian & East African languages.
     */
    getSystemVoicePrompts(language = 'am') {
        const prompts = {
            en: {
                welcome: 'Welcome to Trustworthy Domestic Workers Link. You can record a voice bio and find matching jobs easily.',
                recordBioHint: 'Please speak about your experience, skills, and expected salary in your voice.',
                matchFound: 'A new high-compatibility job match has been found! Tap to listen to details.',
                sosEmergency: 'Emergency SOS alert sent! Admins and your contacts have been alerted with your location.'
            },
            am: {
                welcome: 'እንኳን ወደ ታማኝ የቤት ሠራተኞች ሊንክ በደህና መጡ። በድምፅዎ መግለጫ መቅረፅ እና ሥራዎችን ማግኘት ይችላሉ።',
                recordBioHint: 'እባክዎ ስለራስዎ፣ ስለምትችሉት ሥራ እና የሚፈልጉትን ደመወዝ በድምፅ ይናገሩ።',
                matchFound: 'አዲስ ለእርስዎ የሚስማማ ሥራ ተገኝቷል! ዝርዝሩን ለማዳመጥ እዚህ ይጫኑ።',
                sosEmergency: 'የአደጋ ጊዜ ጥሪ ተላኳል። የአስተዳዳሪ ቡድን እና ተጠሪዎችዎ አሁን ተแจ้งግተዋል።'
            },
            om: {
                welcome: 'Gara Trustworthy Domestic Workers Link nisagaa nagaan dhufte. Sagalee keessaniin muuxannoo keessan waraabduu hojii argachuu dandeessu.',
                recordBioHint: 'Maaloo waayee muuxannoo hojii keessani fi miindaawwan barbaaddan sagaleedhaan dubbadhaa.',
                matchFound: 'Hojiin haarawaa isiniif ta\'u argameera! Bal\'ina isaa dhaggeeffachuuf as tuqaa.',
                sosEmergency: 'Akeekkachiisi balaa (SOS) ergameera! Gareen Bulchiinsaa fi teessoon keessan beeksifamaniiru.'
            },
            ti: {
                welcome: 'ናብ እሙናት ሰራሕተኛታት ገዛ ሊንክ ብደሓን መጻእኩም። ብድምጽኹም መግለጺ ብምቕራጽ ዝሰማማዕ ስራሕ ክትረኽቡ ትኽእሉ።',
                recordBioHint: 'በጃኹም ብዛዕባ ልምድኹም፣ ዘለኹም ክእለትን ዘድልየኹም ደመወዝን ብድምጺ ተናገሩ።',
                matchFound: 'ሓደ ሓድሽ ዝሰማማዕ ስራሕ ተረኺቡ ኣሎ! ዝርዝሩ ንምስማዕ ኣብዚ ጠውቑ።',
                sosEmergency: 'ሓደጋ SOS ተላኢኹ ኣሎ! ምምሕዳርን መተሓላለፍቲ ተሌፎንኩምን ተሓቢሮም ኣለው።'
            },
            so: {
                welcome: 'Ku soo dhawoow Trustworthy Domestic Workers Link. Waxaad ku duubi kartaa codkaaga si aad u hesho shaqooyin kugu habboon.',
                recordBioHint: 'Fadlan ku hadal codkaaga adoo ka sheekaynaya waayo-aragnimadaada iyo mushaharka aad rabto.',
                matchFound: 'Shaqo cusub oo kugu habboon ayaa la helay! Taabo si aad u dhagaysato faahfaahinta.',
                sosEmergency: 'Digniinta degdega ah ee SOS waa la diray! Maamulka iyo dadkaaga xiriirka waa la ogeysiiyay.'
            }
        };

        return prompts[language] || prompts.am;
    }

    /**
     * Simulates NLP transcript processing from recorded audio files across 5 languages.
     */
    async processAudioBio(audioUrl, language = 'am') {
        try {
            const transcriptions = {
                en: 'I have 3 years of experience in house cleaning and cooking. Looking for full-time live-in arrangement.',
                am: 'እኔ በቤት ፅዳት እና በምግብ ማብሰል የ 3 ዓመት ልምድ አለኝ። በሙሉ ጊዜ መሥራት እፈልጋለሁ።',
                om: 'Qulqullina manaa fi nyaata qopheessuu irratti muuxannoo waggaa 3 qaba. Hojii guutuu barbaada.',
                ti: 'ኣብ ጽዳት ገዛን ምብሳል መግብን ናይ 3 ዓመት ልምዲ ኣለኒ። ናይ ምሉእ ግዜ ክሰርሕ እደሊ።',
                so: 'Waxaan leeyahay 3 sano oo waayo-aragnimo ah nadaafadda guriga iyo karinta. Waxaan raadinayaa shaqo buuxda.'
            };

            return {
                status: 'processed',
                audioUrl,
                language,
                transcription: transcriptions[language] || transcriptions.am,
                extractedSkills: ['Cleaning', 'Cooking'],
                suggestedExperienceYears: 3,
                confidenceScore: 0.95
            };
        } catch (error) {
            console.error('[Voice Assistant Error]', error);
            return { status: 'error', message: 'Failed to process voice bio' };
        }
    }
}

module.exports = new VoiceAssistantService();
