import Image from 'next/image';
import Link from 'next/link';

const collageImages = [
  { src: '/images/journey-profile.png', alt: 'Lifestyle creator at her laptop', className: 'left-[34%] top-0 h-[43%] w-[35%]' },
  { src: '/images/creator-filming.png', alt: 'Video creator filming with a camera', className: 'bottom-[20%] left-[10%] h-[40%] w-[31%]' },
  { src: '/images/journey-collaboration.png', alt: 'Beauty creator making content', className: 'right-0 top-[34%] h-[34%] w-[31%]' },
  { src: '/images/creator-podcasting.png', alt: 'Podcast creator recording content', className: 'bottom-0 left-[37%] h-[39%] w-[38%]' },
];

function CreatorCollage() {
  return (
    <div className="relative mx-auto aspect-[1.08/1] w-full max-w-[650px]" aria-label="Creators making lifestyle, video, beauty and podcast content">
      <div className="absolute left-[3%] top-[28%] h-[45%] w-[58%] rounded-full border border-[#b89bff]/35" />
      <div className="absolute left-[8%] top-[34%] h-[33%] w-[43%] rounded-full border border-[#b89bff]/25" />
      <div className="absolute right-[7%] top-[18%] grid grid-cols-4 gap-3 opacity-35"><span className="h-1 w-1 rounded-full bg-[#7c41f4]" /><span className="h-1 w-1 rounded-full bg-[#7c41f4]" /><span className="h-1 w-1 rounded-full bg-[#7c41f4]" /><span className="h-1 w-1 rounded-full bg-[#7c41f4]" /><span className="h-1 w-1 rounded-full bg-[#7c41f4]" /><span className="h-1 w-1 rounded-full bg-[#7c41f4]" /><span className="h-1 w-1 rounded-full bg-[#7c41f4]" /><span className="h-1 w-1 rounded-full bg-[#7c41f4]" /></div>
      <div className="absolute left-[54%] top-[43%] z-10 grid h-[19%] aspect-square place-items-center rounded-full border-4 border-white bg-[#7c41f4] text-3xl text-white shadow-[0_10px_30px_rgba(104,55,229,0.3)]">✧</div>
      {collageImages.map((image) => (
        <div key={image.src} className={`absolute overflow-hidden rounded-[18px] bg-[#eee7e4] shadow-[0_16px_35px_rgba(66,41,110,0.16)] ${image.className}`}>
          <Image src={image.src} alt={image.alt} fill sizes="(max-width: 767px) 90vw, (max-width: 1100px) 46vw, 650px" className="object-cover" />
        </div>
      ))}
      <div className="absolute right-[8%] top-[20%] z-20 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs leading-4 text-[#252b3b] shadow-[0_12px_28px_rgba(49,29,85,0.13)] sm:right-[4%] sm:px-4 sm:py-3 sm:text-sm"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0eaff] text-xl text-[#6b30ee]">♧</span><span>Connect with<br /><strong className="font-semibold text-[#6b30ee]">top brands</strong></span></div>
      <div className="absolute bottom-[7%] left-[6%] z-20 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs leading-4 text-[#252b3b] shadow-[0_12px_28px_rgba(49,29,85,0.13)] sm:px-4 sm:py-3 sm:text-sm"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0eaff] text-xl text-[#6b30ee]">↗</span><span>Grow your<br /><strong className="font-semibold text-[#6b30ee]">influence</strong></span></div>
    </div>
  );
}

export function CreatorFinalCta() {
  return (
    <section id="join" className="relative overflow-hidden bg-[#fffefd] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 xl:px-16">
      <div className="pointer-events-none absolute right-[-12%] top-[8%] h-[620px] w-[720px] rounded-full bg-[#c8b0ff]/18 blur-[120px]" />
      <div className="pointer-events-none absolute left-[20%] top-[35%] h-[360px] w-[460px] rounded-full bg-[#e0d3ff]/14 blur-[110px]" />
      <div className="relative mx-auto max-w-[1450px]">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8 xl:gap-14">
          <div className="relative z-10 max-w-[650px]">
            <p className="text-sm font-bold tracking-[0.14em] text-[#6932e8]">READY TO GET STARTED?</p>
            <span className="mt-5 block h-0.5 w-14 bg-[#6b30ee]" />
            <h2 className="mt-8 font-serif text-[clamp(3.2rem,5.2vw,5.8rem)] leading-[0.9] tracking-[-0.065em] text-black">Your next opportunity could <span className="text-[#7440f4]">start here.</span></h2>
            <p className="mt-8 max-w-[560px] text-lg leading-8 tracking-[-0.025em] text-[#505a70] sm:text-xl sm:leading-9">Create your CloutCo creator profile and put yourself in front of brands looking for creators like you.</p>
            <Link href="/signup" className="mt-10 inline-flex min-h-16 min-w-[250px] items-center justify-center rounded-[16px] bg-gradient-to-r from-[#5e20df] to-[#9558f5] px-8 text-xl font-medium text-white shadow-[0_13px_26px_rgba(100,40,225,0.24)] transition hover:brightness-95">Join as a Creator <span className="ml-5 text-3xl leading-none">→</span></Link>
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#30384b] sm:text-base">
              <span>Free to join</span><span className="text-[#6b30ee]">•</span><span>No hidden fees</span><span className="text-[#6b30ee]">•</span><span>Built for creators</span>
            </div>
          </div>
          <CreatorCollage />
        </div>
        <div className="relative z-10 mt-16 flex items-center justify-center gap-4 text-center text-base leading-6 text-[#364057] sm:mt-20 sm:text-lg"><span className="hidden h-px max-w-[180px] flex-1 bg-[#d9ccef] sm:block" /><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f1ebff] text-xl text-[#6b30ee]">♡</span><p>CloutCo is here to help creators <span className="font-semibold text-[#7440f4]">connect, collaborate and grow.</span></p><span className="hidden h-px max-w-[180px] flex-1 bg-[#d9ccef] sm:block" /></div>
      </div>
    </section>
  );
}
