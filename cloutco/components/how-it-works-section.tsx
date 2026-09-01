import Image from 'next/image';

type JourneyStep = {
  number: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

const steps: JourneyStep[] = [
  {
    number: '01',
    title: 'Create your profile',
    description: 'Tell us about yourself, your content, audience, niche and the platforms you’re on.',
    image: '/images/journey-profile.png',
    imageAlt: 'Creator working on a laptop in her studio',
  },
  {
    number: '02',
    title: 'Get discovered',
    description: 'Your profile becomes part of the CloutCo creator network that brands can discover.',
    image: '/images/journey-discovered.png',
    imageAlt: 'Creator checking content on a phone',
  },
  {
    number: '03',
    title: 'Get collaboration opportunities',
    description: 'When there’s a relevant brand opportunity, CloutCo connects you with the right collaboration.',
    image: '/images/journey-collaboration.png',
    imageAlt: 'Creator communicating about a collaboration',
  },
  {
    number: '04',
    title: 'Grow with CloutCo',
    description: 'Build your portfolio, work with brands and unlock better opportunities over time.',
    image: '/images/journey-grow.png',
    imageAlt: 'Creator recording a podcast',
  },
];

function HowItWorksCard({ step }: { step: JourneyStep }) {
  return (
    <article className="flex h-full min-w-0 flex-1 flex-col rounded-[22px] border border-[#e8e4ef] bg-white p-5 shadow-[0_10px_28px_rgba(57,33,102,0.055)] sm:p-6">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-lg font-semibold leading-none tracking-[-0.045em] text-[#6a2cf0]">{step.number}</span>
        <h3 className="text-[1.2rem] font-semibold leading-[1.15] tracking-[-0.045em] text-black sm:text-[1.25rem]">{step.title}</h3>
      </div>
      <p className="mt-3 text-[0.95rem] leading-6 tracking-[-0.02em] text-[#515a70]">
        {step.description}
      </p>
      <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-[16px] bg-[#ece7e5]">
        <Image src={step.image} alt={step.imageAlt} fill sizes="(max-width: 767px) calc(100vw - 64px), (max-width: 1279px) calc(50vw - 52px), 330px" className="object-cover" />
      </div>
    </article>
  );
}

function JourneyConnector() {
  return (
    <div aria-hidden="true" className="flex h-10 items-center justify-center md:hidden xl:flex xl:h-auto xl:w-10 xl:flex-none">
      <span className="h-full border-l-2 border-dashed border-[#7137f0] xl:h-0 xl:w-full xl:border-l-0 xl:border-t-2" />
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-[#fffefd] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 xl:px-16">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[min(100%,900px)] -translate-x-1/2 rounded-full bg-[#c9b4ff]/15 blur-[105px]" />
      <div className="relative mx-auto max-w-[1440px]">
        <header className="max-w-2xl text-left">
          <p className="inline-flex rounded-full bg-[#f1ebff] px-4 py-1.5 text-xs font-bold tracking-[0.14em] text-[#6728e9]">HOW IT WORKS</p>
          <h2 className="mt-6 font-serif text-[clamp(3.2rem,5vw,5.25rem)] leading-[0.9] tracking-[-0.065em] text-black">
            Your journey.
            <span className="mt-2 block text-[#7440f4]">Real opportunities.</span>
          </h2>
          <p className="mt-6 max-w-[560px] text-lg leading-8 tracking-[-0.025em] text-[#525b71] sm:text-xl">
            CloutCo makes it simple for creators to connect, collaborate and grow.
          </p>
        </header>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:mt-16 xl:flex xl:items-stretch xl:gap-0">
          {steps.map((step, index) => (
            <div key={step.number} className="flex min-w-0 flex-col xl:contents">
              <HowItWorksCard step={step} />
              {index < steps.length - 1 && <JourneyConnector />}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
