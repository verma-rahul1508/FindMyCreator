import Image from 'next/image';
import Link from 'next/link';

const creators = [
  {
    src: '/images/creator-unboxing.png',
    alt: 'Creator unboxing products beside a camera',
    className: 'left-[8%] top-0 h-[28%] w-[47%] lg:w-[48%] 2xl:w-[47%]',
  },
  {
    src: '/images/creator-filming.png',
    alt: 'Creator filming content with a camera',
    className: 'right-0 top-0 h-[34%] w-[35%] lg:w-[37%] 2xl:w-[35%]',
  },
  {
    src: '/images/creator-podcasting.png',
    alt: 'Creator recording a podcast',
    className: 'left-0 top-[31%] h-[38%] w-[42%] lg:w-[44%] 2xl:w-[42%]',
  },
  {
    src: '/images/creator-lifestyle.png',
    alt: 'Lifestyle creator filming outdoors',
    className: 'right-[8%] top-[36%] h-[30%] w-[42%] lg:right-[6%] lg:w-[44%] 2xl:right-[8%] 2xl:w-[42%]',
  },
  {
    src: '/images/creator-photography.png',
    alt: 'Creator working on photography content',
    className: 'bottom-0 left-0 h-[28%] w-[48%] lg:w-[50%] 2xl:w-[48%]',
  },
  {
    src: '/images/creator-music.png',
    alt: 'Music creator recording with a guitar',
    className: 'bottom-0 right-0 h-[32%] w-[46%] lg:w-[48%] 2xl:w-[46%]',
  },
];

function CreatorCollage() {
  return (
    <div
      className="relative mx-auto aspect-[1.08/1] w-full max-w-[680px] lg:max-w-[430px] xl:max-w-[520px] 2xl:max-w-[620px]"
      aria-label="A collage of creators making content"
    >
      <div className="absolute inset-[2%] rounded-full bg-[#8c5bff]/20 blur-[90px]" />
      {creators.map((creator) => (
        <div
          key={creator.src}
          className={`absolute overflow-hidden rounded-[26px] bg-[#ede8e6] shadow-[0_18px_45px_rgba(63,38,110,0.10)] lg:rounded-[22px] xl:rounded-[24px] 2xl:rounded-[26px] ${creator.className}`}
        >
          <Image
            src={creator.src}
            alt={creator.alt}
            fill
            sizes="(max-width: 767px) 90vw, (max-width: 1200px) 50vw, 680px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

export function CreatorHero() {
  return (
    <section id="creators" className="overflow-hidden">
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 pb-14 pt-14 sm:px-8 md:gap-16 md:pt-20 lg:min-h-[calc(100vh-73px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-8 lg:px-12 lg:pb-14 lg:pt-12 xl:grid-cols-[45fr_55fr] xl:gap-12 xl:px-16">
        <div className="relative z-10 max-w-[610px]">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#f2ecff] px-3.5 py-1.5 text-xs font-bold tracking-[0.13em] text-[#6328ed] sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-[#6f27ee]" />
            FOR CREATORS. BACKED BY BRANDS.
          </p>

          <h1 className="mt-8 font-serif text-[clamp(3.25rem,5.4vw,5.55rem)] leading-[0.93] tracking-[-0.065em] text-[#101010]">
            Partner with Brands.
            <span className="mt-2 block text-[#7440f4]">Unlock Business</span>
            <span className="block text-[#7440f4]">Opportunities.</span>
          </h1>

          <p className="mt-8 max-w-[510px] text-lg leading-8 tracking-[-0.025em] text-[#50576e] sm:text-xl sm:leading-9">
            CloutCo connects creators with brands for meaningful collaborations, paid opportunities and long-term partnerships.
          </p>

          <Link
            href="/signup"
            className="mt-10 inline-flex min-h-16 items-center justify-center rounded-[18px] bg-[#6219e8] px-9 text-lg font-medium text-white shadow-[0_12px_28px_rgba(98,25,232,0.24)] transition hover:bg-[#5313cc]"
          >
            Join as a Creator <span className="ml-3 text-xl leading-none">↗</span>
          </Link>

          <p className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.95rem] leading-6 text-[#50576e] sm:text-base">
            <span className="inline-flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#6120df] text-xs text-white">✓</span>Free to join</span>
            <span className="text-[#6120df]">•</span>
            <span>No hidden fees</span>
            <span className="text-[#6120df]">•</span>
            <span>Real opportunities</span>
          </p>
        </div>

        <div className="relative w-full lg:justify-self-end">
          <CreatorCollage />
        </div>
      </div>
    </section>
  );
}
