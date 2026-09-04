import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import authService from '../services/authService';
import { Save, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { compressImage } from '../utils/compression';
import { validateAndFormatPhone } from '../utils/validation';
import { processVideoBio } from '../utils/videoProcessor';
import CameraCapture from '../components/CameraCapture';
import { Camera, Calendar } from 'lucide-react';
import AvailabilityCalendar from '../components/AvailabilityCalendar';

const EditProfile = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [user, setUser] = useState(authService.getCurrentUser());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({});
    const [showCamera, setShowCamera] = useState(false);
    const [uploadingSelfie, setUploadingSelfie] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [faydaIdInput, setFaydaIdInput] = useState('');
    const [faydaOtpInput, setFaydaOtpInput] = useState('');
    const [faydaStep, setFaydaStep] = useState(0); 

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchProfile();
    }, [user, navigate]);

    const fetchProfile = async () => {
        try {
            let endpoint = '';
            if (user.role === 'JOB_SEEKER') endpoint = `/seekers/${user.id}`;
            else if (user.role === 'EMPLOYER') endpoint = `/employers/${user.id}`;

            const res = await api.get(endpoint);

            const data = res.data;
            let currentSkills = [];
            let customSkill = '';
            if (data.skills && Array.isArray(data.skills)) {
                const list = t('skills_list', { returnObjects: true });
                currentSkills = data.skills.filter(s => Object.keys(list).includes(s));
                const custom = data.skills.find(s => !Object.keys(list).includes(s));
                if (custom) {
                    currentSkills.push('other');
                    customSkill = custom;
                }
            }

            let currentLanguages = [];
            let customLanguage = '';
            if (data.languages && Array.isArray(data.languages)) {
                const langList = t('languages_list', { returnObjects: true });
                currentLanguages = data.languages.filter(l => Object.keys(langList).includes(l));
                const customLang = data.languages.find(l => !Object.keys(langList).includes(l));
                if (customLang) {
                    currentLanguages.push('other');
                    customLanguage = customLang;
                }
            }
            setFormData({ ...data, skills: currentSkills, customSkill, languages: currentLanguages, customLanguage });
        } catch (err) {
            console.error("Failed to fetch profile", err);
            alert("Could not load profile data.");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestFaydaOTP = async () => {
        try {
            await api.post('/seekers/fayda/request-otp', { faydaId: faydaIdInput });
            setFaydaStep(1);
            alert(t('otp_sent', 'OTP sent to your Fayda registered phone number!'));
        } catch (err) {
            alert(err.response?.data?.error || t('request_otp_failed', 'Failed to request OTP'));
        }
    };

    const handleVerifyFaydaOTP = async () => {
        try {
            await api.post('/seekers/fayda/verify', { faydaId: faydaIdInput, otpCode: faydaOtpInput });
            setFaydaStep(2);
            setFormData(prev => ({ ...prev, isFaydaVerified: true, faydaId: faydaIdInput }));
            alert(t('fayda_verified', 'Successfully verified Fayda ID!'));
        } catch (err) {
            alert(err.response?.data?.error || t('verify_otp_failed', 'Failed to verify OTP'));
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            let processedFile = file;
            if (file.type.startsWith('image/')) {
                processedFile = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
            }
            setFormData({ ...formData, [e.target.name]: processedFile });
        } catch (err) {
            console.error("Compression error:", err);
            setFormData({ ...formData, [e.target.name]: file });
        }
    };

    const handleVideoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSaving(true);
        try {
            const processed = await processVideoBio(file);
            setFormData({ ...formData, videoBioFile: processed.file, videoBioPreview: URL.createObjectURL(processed.file) });
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSelfieCapture = async (blob) => {
        setUploadingSelfie(true);
        try {
            const selfieFile = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const uploadData = new FormData();
            uploadData.append('selfie', selfieFile);

            const res = await api.post('/upload/live-selfie', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setFormData(prev => ({ ...prev, liveSelfieUrl: res.data.selfieUrl }));
            alert(t('selfie_upload_success') || 'Live selfie captured successfully!');
        } catch (err) {
            console.error("Selfie upload error:", err);
            alert(t('selfie_upload_failed') || 'Failed to upload selfie.');
        } finally {
            setUploadingSelfie(false);
            setShowCamera(false);
        }
    };

    const handleSkillToggle = (skill) => {
        const currentSkills = [...(formData.skills || [])];
        const index = currentSkills.indexOf(skill);
        if (index > -1) {
            currentSkills.splice(index, 1);
        } else {
            currentSkills.push(skill);
        }
        setFormData({ ...formData, skills: currentSkills });
    };

    const handleLanguageToggle = (language) => {
        const currentLanguages = [...(formData.languages || [])];
        const index = currentLanguages.indexOf(language);
        if (index > -1) {
            currentLanguages.splice(index, 1);
        } else {
            currentLanguages.push(language);
        }
        setFormData({ ...formData, languages: currentLanguages });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let endpoint = '';
            const dataToSend = new FormData();

            if (user.role === 'JOB_SEEKER') {
                endpoint = '/seekers/profile';

                if (formData.phone) {
                    const validation = validateAndFormatPhone(formData.phone);
                    if (!validation.isValid) throw new Error(validation.error);
                    formData.phone = validation.formatted;
                }

                let finalSkills = Array.isArray(formData.skills) ? [...formData.skills] : [];
                if (finalSkills.includes('other') && formData.customSkill) {
                    finalSkills = finalSkills.filter(s => s !== 'other');
                    finalSkills.push(formData.customSkill);
                }

                let finalLanguages = Array.isArray(formData.languages) ? [...formData.languages] : [];
                if (finalLanguages.includes('other') && formData.customLanguage) {
                    finalLanguages = finalLanguages.filter(l => l !== 'other');
                    finalLanguages.push(formData.customLanguage);
                }

                dataToSend.append('fullName', formData.fullName);
                dataToSend.append('phone', formData.phone);
                dataToSend.append('age', formData.age);
                dataToSend.append('maritalStatus', formData.maritalStatus || 'SINGLE');
                dataToSend.append('religion', formData.religion || '');
                dataToSend.append('skills', JSON.stringify(finalSkills));
                dataToSend.append('languages', JSON.stringify(finalLanguages));
                dataToSend.append('experienceYears', formData.experienceYears);
                dataToSend.append('expectedSalary', formData.expectedSalary);
                dataToSend.append('preferredArrangement', formData.preferredArrangement || 'LIVE_IN');
                dataToSend.append('preferredLocation', formData.preferredLocation);
                dataToSend.append('bio', formData.bio || '');
                dataToSend.append('guarantorPhone', formData.guarantorPhone || '');
                dataToSend.append('passwordHint', formData.passwordHint || '');
                dataToSend.append('securityQuestion', formData.securityQuestion || '');
                dataToSend.append('securityAnswer', formData.securityAnswer || '');
                dataToSend.append('availability', JSON.stringify(formData.availability || {}));
                dataToSend.append('videoTranscription', JSON.stringify(formData.videoTranscription || {}));

                if (formData.profilePhoto instanceof File) {
                    dataToSend.append('profilePhoto', formData.profilePhoto);
                }
                if (formData.idDocument instanceof File) {
                    dataToSend.append('idDocument', formData.idDocument);
                }
                if (formData.nationalIdUrl instanceof File) {
                    dataToSend.append('nationalIdUrl', formData.nationalIdUrl);
                    // Explicitly track if this is a Fayda upgrade for rank calculation boost
                }
                if (formData.guarantorIdUrl instanceof File) {
                    dataToSend.append('guarantorIdUrl', formData.guarantorIdUrl);
                }
                if (formData.policeClearanceUrl instanceof File) {
                    dataToSend.append('policeClearanceUrl', formData.policeClearanceUrl);
                }
                if (formData.healthCertificateUrl instanceof File) {
                    dataToSend.append('healthCertificateUrl', formData.healthCertificateUrl);
                }
                if (formData.videoBioFile instanceof File) {
                    dataToSend.append('videoBio', formData.videoBioFile);
                }
            } else {
                endpoint = '/employers/profile';

                if (formData.phone) {
                    const validation = validateAndFormatPhone(formData.phone);
                    if (!validation.isValid) throw new Error(validation.error);
                    formData.phone = validation.formatted;
                }

                dataToSend.append('contactName', formData.contactName);
                dataToSend.append('phone', formData.phone);
                dataToSend.append('address', formData.address);
                dataToSend.append('passwordHint', formData.passwordHint || '');
                dataToSend.append('securityQuestion', formData.securityQuestion || '');
                dataToSend.append('securityAnswer', formData.securityAnswer || '');
                if (formData.familySize) dataToSend.append('familySize', formData.familySize);

                if (formData.profilePhoto instanceof File) {
                    dataToSend.append('profilePhoto', formData.profilePhoto);
                }
                if (formData.idDocument instanceof File) {
                    dataToSend.append('idDocument', formData.idDocument);
                }
            }

            const res = await api.put(endpoint, dataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            const updatedUser = { ...user, fullName: res.data.fullName || res.data.contactName };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            alert('Profile updated successfully!');
            navigate(-1);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Failed to update profile.');
        } finally {
            setSaving(false);
            setUploadProgress(0);
        }
    };

    if (loading) return <div className="container" style={{ padding: '50px' }}>Loading...</div>;

    return (
        <div className="container" style={{ padding: '40px 20px', maxWidth: '800px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px', cursor: 'pointer', color: '#666' }}>
                <ArrowLeft size={18} /> {t('back_dashboard')}
            </button>

            <div className="card">
                <h2 style={{ marginBottom: '30px', color: 'var(--primary)' }}>{t('edit_profile')}</h2>

                <form onSubmit={handleSubmit}>
                    {user.role === 'JOB_SEEKER' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            <div>
                                <label className="label">{t('full_name')}</label>
                                <input required className="input" name="fullName" value={formData.fullName || ''} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="label">{t('phone_number')}</label>
                                <input required className="input" name="phone" value={formData.phone || ''} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="label">{t('age')}</label>
                                <input required type="number" className="input" name="age" value={formData.age || ''} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="label">{t('marital_status')}</label>
                                <select className="input" name="maritalStatus" value={formData.maritalStatus || 'SINGLE'} onChange={handleChange}>
                                    <option value="SINGLE">{t('single')}</option>
                                    <option value="MARRIED">{t('married')}</option>
                                    <option value="DIVORCED">{t('divorced')}</option>
                                    <option value="WIDOWED">{t('widowed')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">{t('religion')}</label>
                                <input className="input" name="religion" value={formData.religion || ''} onChange={handleChange} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label">{t('skills_required')} (Select multiple)</label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    gap: '10px',
                                    background: '#f9f9f9',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd'
                                }}>
                                    {Object.entries(t('skills_list', { returnObjects: true })).map(([key, value]) => (
                                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={(formData.skills || []).includes(key)}
                                                onChange={() => handleSkillToggle(key)}
                                            />
                                            {value}
                                        </label>
                                    ))}
                                </div>
                                {(formData.skills || []).includes('other') && (
                                    <div style={{ marginTop: '10px' }}>
                                        <input
                                            className="input"
                                            name="customSkill"
                                            value={formData.customSkill || ''}
                                            onChange={handleChange}
                                            placeholder={t('specify_other')}
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label">{t('select_languages')}</label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    gap: '10px',
                                    background: '#f9f9f9',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd'
                                }}>
                                    {Object.entries(t('languages_list', { returnObjects: true })).map(([key, value]) => (
                                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={(formData.languages || []).includes(key)}
                                                onChange={() => handleLanguageToggle(key)}
                                            />
                                            {value}
                                        </label>
                                    ))}
                                </div>
                                {(formData.languages || []).includes('other') && (
                                    <div style={{ marginTop: '10px' }}>
                                        <input
                                            className="input"
                                            name="customLanguage"
                                            value={formData.customLanguage || ''}
                                            onChange={handleChange}
                                            placeholder={t('specify_other_language')}
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="label">{t('experience_years')}</label>
                                <input required type="number" className="input" name="experienceYears" value={formData.experienceYears || ''} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="label">{t('expected_salary')}</label>
                                <input required type="number" className="input" name="expectedSalary" value={formData.expectedSalary || ''} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="label">{t('preferred_arrangement')}</label>
                                <select className="input" name="preferredArrangement" value={formData.preferredArrangement || 'LIVE_IN'} onChange={handleChange}>
                                    <option value="LIVE_IN">{t('live_in')}</option>
                                    <option value="LIVE_OUT">{t('live_out')}</option>
                                    <option value="PART_TIME">{t('part_time')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">{t('preferred_location')}</label>
                                <input required className="input" name="preferredLocation" value={formData.preferredLocation || ''} onChange={handleChange} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label">{t('bio_about_me')}</label>
                                <textarea className="input" name="bio" value={formData.bio || ''} onChange={handleChange} style={{ minHeight: '100px' }} />
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label">{t('video_bio')} (Max 15s, 3MB) {t('optional')}</label>
                                <input type="file" className="input" name="videoBio" accept="video/*" onChange={handleVideoChange} />
                                {(formData.videoBioPreview || formData.videoBio) && (
                                    <video src={formData.videoBioPreview || (formData.videoBio?.startsWith('http') ? formData.videoBio : `https://edwl-backend-1.onrender.com${formData.videoBio}`)} controls style={{ width: '100%', maxWidth: '300px', marginTop: '10px', borderRadius: '8px' }} />
                                )}
                            </div>

                            <div>
                                <label className="label">{t('profile_photo')} (Image)</label>
                                <input type="file" className="input" name="profilePhoto" accept="image/*" onChange={handleFileChange} />
                            </div>
                            <div>
                                <label className="label">{t('id_document')} (Image)</label>
                                <input type="file" className="input" name="idDocument" accept="image/*" onChange={handleFileChange} />
                                <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px' }}>{t('re_verify_hint') || "Updating your ID will require re-verification by admin."}</p>
                            </div>

                            <div style={{ gridColumn: '1 / -1', background: '#eef2ff', padding: '20px', borderRadius: '8px', border: '1px solid #c7d2fe', marginTop: '10px' }}>
                                <h4 style={{ color: '#3730a3', marginBottom: '10px' }}>🇪🇹 National ID (Fayda) Verification</h4>
                                {formData.isFaydaVerified ? (
                                    <div style={{ color: '#166534', fontWeight: 'bold' }}>✅ Your Fayda ID ({formData.faydaId}) is Verified</div>
                                ) : (
                                    faydaStep === 0 ? (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input className="input" placeholder="Enter 12-digit Fayda ID" value={faydaIdInput} onChange={e => setFaydaIdInput(e.target.value)} />
                                            <button type="button" className="btn-primary" onClick={handleRequestFaydaOTP}>Verify Fayda</button>
                                        </div>
                                    ) : faydaStep === 1 ? (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input className="input" placeholder="Enter OTP (e.g. 123456)" value={faydaOtpInput} onChange={e => setFaydaOtpInput(e.target.value)} />
                                            <button type="button" className="btn-primary" onClick={handleVerifyFaydaOTP}>Submit OTP</button>
                                        </div>
                                    ) : (
                                        <div style={{ color: '#166534', fontWeight: 'bold' }}>✅ Verified in this session. Save changes to keep it!</div>
                                    )
                                )}
                                <p style={{ fontSize: '0.8rem', color: '#4f46e5', marginTop: '5px' }}>Verified users get priority matching and the highly trusted "Verified" badge.</p>
                            </div>

                            <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                                <AvailabilityCalendar 
                                    availability={formData.availability} 
                                    onChange={(newSched) => setFormData({ ...formData, availability: newSched })} 
                                />
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />
                                <h4 style={{ marginBottom: '15px' }}>{t('account_recovery')}</h4>
                            </div>

                            <div>
                                <label className="label">{t('password_hint')} ({t('optional')})</label>
                                <input className="input" name="passwordHint" value={formData.passwordHint || ''} onChange={handleChange} placeholder={t('hint_placeholder')} />
                            </div>
                            <div>
                                <label className="label">{t('security_question')}</label>
                                <input className="input" name="securityQuestion" value={formData.securityQuestion || ''} onChange={handleChange} placeholder="e.g. Your first pet?" />
                            </div>
                            <div>
                                <label className="label">{t('security_answer')}</label>
                                <input className="input" name="securityAnswer" value={formData.securityAnswer || ''} onChange={handleChange} type="password" />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            <div>
                                <label className="label">{t('contact_person_name')}</label>
                                <input required className="input" name="contactName" value={formData.contactName || ''} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="label">{t('phone_number')}</label>
                                <input required className="input" name="phone" value={formData.phone || ''} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="label">{t('address_location')}</label>
                                <input required className="input" name="address" value={formData.address || ''} onChange={handleChange} />
                            </div>
                            {formData.employerType === 'HOUSEHOLD' && (
                                <div>
                                    <label className="label">{t('family_size')}</label>
                                    <input required type="number" className="input" name="familySize" value={formData.familySize || ''} onChange={handleChange} />
                                </div>
                            )}
                            <div>
                                <label className="label">{t('profile_photo')} (Image)</label>
                                <input type="file" className="input" name="profilePhoto" accept="image/*" onChange={handleFileChange} />
                            </div>
                            <div>
                                <label className="label">{t('id_document')} (Image)</label>
                                <input type="file" className="input" name="idDocument" accept="image/*" onChange={handleFileChange} />
                                <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px' }}>{t('re_verify_hint') || "Updating your ID will require re-verification by admin."}</p>
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />
                                <h4 style={{ marginBottom: '15px' }}>{t('account_recovery')}</h4>
                            </div>

                            <div>
                                <label className="label">{t('password_hint')} ({t('optional')})</label>
                                <input className="input" name="passwordHint" value={formData.passwordHint || ''} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="label">{t('security_question')}</label>
                                <input className="input" name="securityQuestion" value={formData.securityQuestion || ''} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="label">{t('security_answer')}</label>
                                <input className="input" name="securityAnswer" value={formData.securityAnswer || ''} onChange={handleChange} type="password" />
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '15px' }}>
                        {saving && uploadProgress > 0 && uploadProgress < 100 && (
                            <div style={{ width: '100%', maxWidth: '300px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.85rem', color: '#666' }}>
                                    <span>{t('uploading_files') || 'Uploading files...'}</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--primary)', transition: 'width 0.2s' }}></div>
                                </div>
                            </div>
                        )}
                        <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {saving ? t('saving') : t('save_changes')} <Save size={18} />
                        </button>
                     </div>
                </form>
            </div>

            {showCamera && (
                <CameraCapture 
                    onCapture={handleSelfieCapture} 
                    onClose={() => setShowCamera(false)} 
                />
            )}

            <style>{`
        .label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 0.9rem; }
        .input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 1rem; font-family: inherit; }
      `}</style>
        </div>
    );
};

export default EditProfile;
