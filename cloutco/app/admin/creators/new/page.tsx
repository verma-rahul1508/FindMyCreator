'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminCreatorPhotoUploader } from '@/components/admin-creator-photo-uploader';
import { FacebookAnalyticsEditor } from '@/components/facebook-analytics-editor';
import { InstagramAnalyticsEditor } from '@/components/instagram-analytics-editor';
import { getSupabaseClient } from '@/lib/supabase/client';

type PlatformName = 'Instagram' | 'Facebook' | 'YouTube';
type InstagramInsights = { overview: Record<string, string>; audience: { women: string; men: string; topAgeRanges: string[]; topCities: string[] } };
type FacebookInsights = { period: '7' | '28' | '90'; overview: { viewsTotal: string; viewers: string }; engagement: { total: string }; audience: { netFollowers: string; women: string; men: string; topAgeGroup?: string; topCities?: string[] } };
type SocialAccount = { id: string; platform: PlatformName; profileUrl: string; username: string; audienceCount: string; isPrimary: boolean; instagramInsights?: InstagramInsights; facebookInsights?: FacebookInsights; youtubeInsights?: { views: string; likes: string; shares: string; topCountry: string } };
type Payload = { basic: { fullName: string; email: string; phoneNumber: string; currentCity: string; dateOfBirth: string; gender: string; more: string }; identity: { displayName: string; bio: string; languages: string[]; creatorType: string; creatorTypeOther: string }; content: { primaryNiche: string; primaryNicheOther: string; otherNiches: string[]; otherNichesOther: string; contentFormats: string[]; contentFormatsOther: string; contentStyles: string[]; contentStylesOther: string }; socialAccounts: SocialAccount[] };

const niches = ['Beauty','Fashion','Food & Beverage','Travel','Lifestyle','Fitness','Health & Wellness','Technology','Gaming','Finance','Business','Education','Parenting & Family','Entertainment','Comedy','Music','Art & Design','Photography','Automotive','Sports','Home & Interiors','Pets','Culture','DIY & Crafts','Other'];
const formats = ['Reels / Short Videos','Long-form Videos','Stories','Photos','Carousels','Tutorials / How-to','Reviews','Vlogs','UGC','Livestreams','Podcasts','Written Content','Other'];
const styles = ['Educational','Entertaining','Informative','Inspirational','Storytelling','Conversational','Tutorial / How-to','Review-focused','Promotional','Trend-driven','Cinematic','Relatable','Experimental','Other'];
const languages = ['English','Hindi','Tamil','Telugu','Bengali','Marathi','Gujarati','Kannada','Malayalam','Punjabi','Spanish','French'];
const emptyPayload: Payload = { basic: { fullName: '', email: '', phoneNumber: '', currentCity: '', dateOfBirth: '', gender: '', more: '' }, identity: { displayName: '', bio: '', languages: [], creatorType: '', creatorTypeOther: '' }, content: { primaryNiche: '', primaryNicheOther: '', otherNiches: [], otherNichesOther: '', contentFormats: [], contentFormatsOther: '', contentStyles: [], contentStylesOther: '' }, socialAccounts: [] };
const emptyInstagram = (): InstagramInsights => ({ overview: { views: '', netFollowers: '', interactions: '', viewersTotal: '', profileVisits: '' }, audience: { women: '', men: '', topAgeRanges: [], topCities: [] } });
const emptyFacebook = (): FacebookInsights => ({ period: '28', overview: { viewsTotal: '', viewers: '' }, engagement: { total: '' }, audience: { netFollowers: '', women: '', men: '', topAgeGroup: '', topCities: [] } });


function prefillCreator(profile: Record<string, Record<string, unknown>>, detail: { platforms?: Array<Record<string, unknown>> }): Payload {
  const text = (value: unknown) => value === null || value === undefined ? '' : String(value);
  const list = (value: unknown): string[] => Array.isArray(value) ? value.map(text) : [];
  const b = profile.basic || {}, i = profile.identity || {}, c = profile.content || {};
  return {
    basic: { fullName: text(b.full_name), email: text(b.email), phoneNumber: text(b.phone_number), currentCity: text(b.current_city), dateOfBirth: text(b.date_of_birth), gender: text(b.gender), more: text(b.more) },
    identity: { displayName: text(i.display_name), bio: text(i.bio), languages: list(i.languages), creatorType: text(i.creator_type), creatorTypeOther: text(i.creator_type_other) },
    content: { primaryNiche: text(c.primary_niche), primaryNicheOther: text(c.primary_niche_other), otherNiches: list(c.other_niches), otherNichesOther: text(c.other_niches_other), contentFormats: list(c.content_formats), contentFormatsOther: text(c.content_formats_other), contentStyles: list(c.content_styles), contentStylesOther: text(c.content_styles_other) },
    socialAccounts: (detail.platforms || []).map((account) => {
      const ig = (account.instagramAnalytics || {}) as Record<string, unknown>;
      const fb = (account.facebookAnalytics || {}) as Record<string, unknown>;
      const yt = (account.youtubeAnalytics || {}) as Record<string, unknown>;
      const platform: PlatformName = account.platform === 'instagram' ? 'Instagram' : account.platform === 'facebook' ? 'Facebook' : 'YouTube';
      return { id: text(account.id), platform, profileUrl: text(account.profileUrl), username: text(account.username), audienceCount: text(account.audienceCount), isPrimary: account.isPrimary === true,
        ...(platform === 'Instagram' ? { instagramInsights: { overview: { views: text(ig.views), netFollowers: text(ig.netFollowers), interactions: text(ig.interactions), viewersTotal: text(ig.viewersTotal), profileVisits: text(ig.profileVisits) }, audience: { women: text(ig.womenPercentage), men: text(ig.menPercentage), topAgeRanges: list(ig.topAgeRanges), topCities: list(ig.topCities) } } } : platform === 'Facebook' ? { facebookInsights: { period: '28' as const, overview: { viewsTotal: text(fb.views), viewers: text(fb.viewers) }, engagement: { total: text(fb.engagement) }, audience: { netFollowers: text(fb.netFollowers), women: text(fb.womenPercentage), men: text(fb.menPercentage), topAgeGroup: text(fb.topAgeGroup), topCities: list(fb.topCities) } } } : { youtubeInsights: { views: text(yt.views), likes: text(yt.likes), shares: text(yt.shares), topCountry: text(yt.topCountry) } }) };
    }),
  };
}

function mergePayload(saved: Payload, draft: Partial<Payload> | null | undefined): Payload {
  if (!draft) return saved;
  return {
    ...saved,
    ...draft,
    basic: { ...saved.basic, ...draft.basic },
    identity: { ...saved.identity, ...draft.identity },
    content: { ...saved.content, ...draft.content },
    socialAccounts: draft.socialAccounts || saved.socialAccounts,
  };
}

function toggle(values: string[], value: string) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-[#2b3242]"><span>{label}</span>{children}</label>; }
const inputClass = 'mt-2 min-h-11 w-full rounded-xl border border-[#dfe4ef] bg-white px-3.5 text-sm font-normal outline-none transition focus:border-[#7b62ed]';

export default function AdminCreatorOnboardingPage() {
  const router = useRouter(); const searchParams = useSearchParams(); const requestedDraft = searchParams.get('draft'); const requestedCreator = searchParams.get('creator');
  const [payload, setPayload] = useState<Payload>(emptyPayload); const [draftId, setDraftId] = useState<string | null>(requestedDraft); const [creatorId, setCreatorId] = useState<string | null>(null); const [loading, setLoading] = useState(Boolean(requestedDraft || requestedCreator)); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [originalSocial, setOriginalSocial] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setLoaded(false); setError(''); setMessage('');
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase is not configured.');
        let next: Payload = emptyPayload;
        if (requestedCreator) {
          const [profile, detail] = await Promise.all([
            supabase.rpc('admin_get_creator_profile_for_edit', { p_creator_id: requestedCreator }),
            supabase.rpc('admin_creator_detail', { p_creator_id: requestedCreator }),
          ]);
          if (profile.error || detail.error || !profile.data || !detail.data) throw new Error('We could not load this creator. Please reload to try again.');
          next = mergePayload(prefillCreator(profile.data, detail.data), profile.data.draftPayload as Partial<Payload> | null | undefined);
        } else if (requestedDraft) {
          const { data, error: loadError } = await supabase.rpc('admin_get_creator_onboarding', { p_draft_id: requestedDraft });
          if (loadError || !data) throw new Error('We could not load this onboarding draft.');
          next = { ...emptyPayload, ...data.payload, basic: { ...emptyPayload.basic, ...data.payload.basic }, identity: { ...emptyPayload.identity, ...data.payload.identity }, content: { ...emptyPayload.content, ...data.payload.content }, socialAccounts: data.payload.socialAccounts || [] };
          if (active) setCreatorId(data.creatorId);
        }
        if (active) { setPayload(next); setDraftId(requestedCreator ? null : requestedDraft); if (requestedCreator || !requestedDraft) setCreatorId(requestedCreator); setOriginalSocial(JSON.stringify(next.socialAccounts)); setLoaded(true); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load profile.'); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [requestedCreator, requestedDraft]);
  const update = <K extends keyof Payload>(section: K, changes: Partial<Payload[K]>) => setPayload((current) => ({ ...current, [section]: { ...current[section], ...changes } }));
  const updateAccount = (id: string, changes: Partial<SocialAccount>) => setPayload((current) => ({ ...current, socialAccounts: current.socialAccounts.map((account) => account.id === id ? { ...account, ...changes } : account) }));
  const setPrimary = (id: string, checked: boolean) => setPayload((current) => ({ ...current, socialAccounts: current.socialAccounts.map((account) => checked ? { ...account, isPrimary: account.id === id } : account.id === id ? { ...account, isPrimary: false } : account) }));
  const addPlatform = (platform: PlatformName) => setPayload((current) => ({ ...current, socialAccounts: [...current.socialAccounts, { id: `${platform.toLowerCase()}-${Date.now()}`, platform, profileUrl: '', username: '', audienceCount: '', isPrimary: current.socialAccounts.length === 0, ...(platform === 'Instagram' ? { instagramInsights: emptyInstagram() } : platform === 'Facebook' ? { facebookInsights: emptyFacebook() } : { youtubeInsights: { views: '', likes: '', shares: '', topCountry: '' } }) }] }));
  const save = async () => {
    if (saving || !loaded) return;
    if (payload.socialAccounts.length && payload.socialAccounts.filter((account) => account.isPrimary).length !== 1) { setError('Select exactly one primary social platform before saving.'); return; }
    const supabase = getSupabaseClient(); if (!supabase) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const { data, error: saveError } = requestedCreator
        ? await supabase.rpc('admin_save_existing_creator', { p_creator_id: requestedCreator, p_payload: payload, p_update_social: JSON.stringify(payload.socialAccounts) !== originalSocial })
        : await supabase.rpc('admin_save_creator_onboarding', { p_draft_id: draftId, p_payload: payload });
      if (saveError || !data) {
        if (saveError?.code === '23505' && saveError.message.includes('creators_email_key')) {
          throw new Error('A creator with this email already exists. Open that creator\'s profile to edit it instead.');
        }
        throw new Error(saveError?.message || 'We could not save this creator.');
      }
      setCreatorId(data.creatorId);
      if (requestedCreator) { setOriginalSocial(JSON.stringify(payload.socialAccounts)); setMessage('Creator profile updated successfully.'); }
      else { setDraftId(data.draftId); router.replace(`/admin/creators/new?draft=${data.draftId}`); setMessage(data.creatorId ? 'Saved. This creator is now available for review.' : 'Draft saved. Add a name to create the creator record.'); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save creator.'); }
    finally { setSaving(false); }
  };
  const available = useMemo(() => (['Instagram','Facebook','YouTube'] as PlatformName[]).filter((platform) => !payload.socialAccounts.some((account) => account.platform === platform)), [payload.socialAccounts]);
  if (!loading && !loaded) return <section className="mx-auto max-w-6xl px-5 py-10"><Link href="/admin/creators" className="text-sm text-[#6330dc]">Back to Creators</Link><p role="alert" className="mt-5 text-sm text-red-700">{error}</p></section>;
  if (loading) return <section className="grid min-h-[50vh] place-items-center text-sm text-[#697080]">Loading creator details...</section>;
  return <section className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-8 sm:py-12 lg:px-10"><Link href="/admin/creators" className="text-sm font-semibold text-[#6330dc]">← Creator Management</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7C3AED]">Manual onboarding</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em]">{requestedCreator ? 'Edit creator' : 'Add a creator'}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#626a7a]">{requestedCreator ? 'Update the creator details below and save your changes.' : 'Capture creator details from your call. Save at any point; incomplete sections remain in this private admin draft.'}</p></div>{creatorId && <Link href={`/admin/creators/${creatorId}`} className="rounded-lg border border-[#dedbe5] px-4 py-2.5 text-sm font-semibold">Open Review Profile</Link>}</div>
    <div className="mt-8 space-y-6">
      <section className="rounded-2xl border border-[#e8e7eb] bg-white p-5 sm:p-7"><h2 className="text-xl font-semibold">Basic Information</h2><p className="mt-1 text-sm text-[#697080]">{requestedCreator ? 'Update the saved contact and personal information.' : 'Enter a name to create the creator record. You can save the remaining details as you collect them; no invite or signup link is sent.'}</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{([['Full name','fullName','text'],['Email','email','email'],['Phone number','phoneNumber','tel'],['Current city','currentCity','text'],['Date of birth','dateOfBirth','date'],['Gender','gender','select']] as const).map(([label,key,type]) => <Field key={key} label={label}>{type === 'select' ? <select value={payload.basic.gender} onChange={(event) => update('basic',{ gender:event.target.value })} className={inputClass}><option value="">Select gender</option>{['Male','Female','Non-binary','Prefer not to say'].map((option) => <option key={option}>{option}</option>)}</select> : <input type={type} value={payload.basic[key]} onChange={(event) => update('basic',{ [key]:event.target.value })} className={inputClass}/>}</Field>)}</div><Field label="Notes (optional)"><textarea value={payload.basic.more} onChange={(event) => update('basic',{ more:event.target.value })} rows={3} className={`${inputClass} resize-none`} /></Field></section>
      <section className="rounded-2xl border border-[#e8e7eb] bg-white p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Creator Identity</h2>
        {creatorId ? <AdminCreatorPhotoUploader creatorId={creatorId} name={payload.identity.displayName || payload.basic.fullName} /> : <p className="mt-3 text-sm text-[#697080]">Save the creator first to upload their profile photo.</p>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Display name"><input value={payload.identity.displayName} onChange={(event) => update('identity',{ displayName:event.target.value })} className={inputClass}/></Field>
          <Field label="Creator type"><select value={payload.identity.creatorType} onChange={(event) => update('identity',{ creatorType:event.target.value })} className={inputClass}><option value="">Select creator type</option><option value="content_creator">Content Creator</option><option value="influencer">Influencer</option><option value="ugc_creator">UGC Creator</option><option value="digital_creator">Digital Creator</option><option value="other">Other</option></select></Field>
          {payload.identity.creatorType === 'other' && <Field label="Creator type"><input value={payload.identity.creatorTypeOther} onChange={(event) => update('identity',{ creatorTypeOther:event.target.value })} className={inputClass}/></Field>}
        </div>
        <Field label="Bio"><textarea value={payload.identity.bio} onChange={(event) => update('identity',{ bio:event.target.value })} rows={3} className={`${inputClass} resize-none`} /></Field>
        <p className="mt-5 text-sm font-semibold">Languages</p>
        <div className="mt-3 flex flex-wrap gap-2">{languages.map((language) => <button key={language} type="button" onClick={() => update('identity',{ languages:toggle(payload.identity.languages,language) })} className={`rounded-full border px-3 py-1.5 text-sm ${payload.identity.languages.includes(language) ? 'border-[#6330dc] bg-[#f1ebff] text-[#6330dc]' : 'border-[#dedbe5]'}`}>{language}</button>)}</div>
      </section>
      <section className="rounded-2xl border border-[#e8e7eb] bg-white p-5 sm:p-7"><h2 className="text-xl font-semibold">Content &amp; Niche</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Primary niche"><select value={payload.content.primaryNiche} onChange={(event) => update('content',{ primaryNiche:event.target.value })} className={inputClass}><option value="">Select niche</option>{niches.map((option) => <option key={option}>{option}</option>)}</select></Field>{payload.content.primaryNiche === 'Other' && <Field label="Primary niche"><input value={payload.content.primaryNicheOther} onChange={(event) => update('content',{ primaryNicheOther:event.target.value })} className={inputClass}/></Field>}</div>{([['Other niches','otherNiches',niches],['Content formats','contentFormats',formats],['Content styles','contentStyles',styles]] as const).map(([label,key,options]) => <div key={key} className="mt-5"><p className="text-sm font-semibold">{label}</p><div className="mt-3 flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" onClick={() => update('content',{ [key]:toggle(payload.content[key],option) })} className={`rounded-full border px-3 py-1.5 text-sm ${payload.content[key].includes(option) ? 'border-[#6330dc] bg-[#f1ebff] text-[#6330dc]' : 'border-[#dedbe5]'}`}>{option}</button>)}</div>{payload.content[key].includes('Other') && <Field label="Other details"><input value={payload.content[(key + 'Other') as 'otherNichesOther' | 'contentFormatsOther' | 'contentStylesOther']} onChange={(event) => update('content', { [key + 'Other']: event.target.value })} className={inputClass} /></Field>}</div>)}</section>
      <section className="rounded-2xl border border-[#e8e7eb] bg-white p-5 sm:p-7"><h2 className="text-xl font-semibold">Social Platforms</h2><p className="mt-1 text-sm text-[#697080]">Use the same saved platform and analytics values supplied by the creator. Select one primary platform.</p><div className="mt-5 space-y-5">{payload.socialAccounts.map((account) => account.platform === 'Instagram' ? <InstagramAnalyticsEditor key={account.id} account={account} errors={{}} onChange={(changes) => updateAccount(account.id,changes)} onPrimaryToggle={(checked) => setPrimary(account.id,checked)} onRemoveRequest={() => setPayload((current) => ({ ...current, socialAccounts:current.socialAccounts.filter((item) => item.id !== account.id) }))} /> : account.platform === 'Facebook' ? <FacebookAnalyticsEditor key={account.id} account={account} errors={{}} onChange={(changes) => updateAccount(account.id,changes)} onPrimaryToggle={(checked) => setPrimary(account.id,checked)} onRemoveRequest={() => setPayload((current) => ({ ...current, socialAccounts:current.socialAccounts.filter((item) => item.id !== account.id) }))} /> : <section key={account.id} className="rounded-2xl border border-[#e1dcef] bg-[#fcfbff] p-5"><div className="flex justify-between"><h3 className="text-lg font-semibold">YouTube {account.isPrimary && <span className="ml-2 text-sm text-[#6330dc]">Primary</span>}</h3><button type="button" onClick={() => setPayload((current) => ({ ...current, socialAccounts:current.socialAccounts.filter((item) => item.id !== account.id) }))} className="text-sm font-semibold text-[#a83a46]">Remove</button></div><div className="mt-4 grid gap-4 sm:grid-cols-2">{([['Profile URL','profileUrl'],['Username','username'],['Subscribers','audienceCount'],['Views','views'],['Likes','likes'],['Shares','shares'],['Top country','topCountry']] as const).map(([label,key]) => <Field key={key} label={label}><input value={key in account ? String(account[key as keyof SocialAccount] || '') : account.youtubeInsights?.[key as keyof NonNullable<SocialAccount['youtubeInsights']>] || ''} onChange={(event) => key in account ? updateAccount(account.id,{ [key]:event.target.value }) : updateAccount(account.id,{ youtubeInsights:{ ...account.youtubeInsights!, [key]:event.target.value } })} className={inputClass}/></Field>)}</div><label className="mt-5 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={account.isPrimary} onChange={(event) => setPrimary(account.id,event.target.checked)} />Primary platform</label></section>)}</div>{available.length > 0 && <div className="mt-5 flex flex-wrap gap-3">{available.map((platform) => <button type="button" key={platform} onClick={() => addPlatform(platform)} className="rounded-lg border border-[#dedbe5] px-4 py-2 text-sm font-semibold text-[#6330dc]">+ Add {platform}</button>)}</div>}</section>
      {error && <p role="alert" className="rounded-xl border border-[#f0c6c6] bg-[#fff7f7] px-4 py-3 text-sm text-[#b13d3d]">{error}</p>}{message && <p role="status" className="rounded-xl border border-[#cce8da] bg-[#f3fbf6] px-4 py-3 text-sm text-[#26754b]">{message}</p>}<div className="flex justify-end border-t border-[#e8e7eb] pt-6"><button type="button" onClick={() => void save()} disabled={saving} className="min-h-11 rounded-xl bg-[#6330dc] px-6 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : requestedCreator ? 'Save changes' : 'Save creator'}</button></div>
    </div></section>;
}
