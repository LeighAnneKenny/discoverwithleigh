// All site copy, extracted from the WordPress export. Becomes the D1 seed in phase 4.

export const meta = {
  title: 'Discover With Leigh | Photographer & Digital Marketing Specialist',
  description:
    'Professional photography, video creation, social media management and influencer campaigns in Cape Town. Let’s bring your brand to life through stunning visuals and compelling marketing.',
  url: 'https://discoverwithleigh.co.za',
};

export const socials = [
  { name: 'TikTok', url: 'https://www.tiktok.com/@discover_with_leigh' },
  { name: 'Instagram', url: 'https://www.instagram.com/discover_with_leigh/' },
  { name: 'Facebook', url: 'https://www.facebook.com/leighannekennyza' },
  { name: 'YouTube', url: 'https://www.youtube.com/channel/UCjyVZP6593CcIpepfOIKs1w' },
  { name: 'WhatsApp', url: 'http://wa.link/s5hdey' },
] as const;

export const nav = [
  { label: 'About', href: '#about' },
  { label: 'Photography', href: '#photography' },
  { label: 'Video', href: '#video' },
  { label: 'Marketing', href: '#marketing' },
  { label: 'Influencer', href: '#influencer' },
  { label: 'Contact', href: '#contact' },
] as const;

export const hero = {
  title: 'Discover With Leigh',
  subtitle: 'Professional Photographer & Digital Marketing Specialist',
};

export const about = {
  eyebrow: 'About me',
  heading: 'I bring your brand to life through stunning visuals and compelling marketing.',
  body: [
    'My expertise in professional photography, marketing video content, social media management, and influencer campaigns ensures that I create authentic content that truly resonates with your audience. My unparalleled skills and unwavering dedication to excellence have built a loyal community that trusts my work. Let’s collaborate to elevate your brand and achieve extraordinary success together.',
    'Ready to take your brand to the next level? Contact me today to get started on creating exceptional content that captivates and converts. Let’s make your vision a reality!',
  ],
  cta: 'Get started here',
};

export const services = [
  'Professional Photography',
  'Video Creation',
  'Social Media Management',
  'Influencer Campaigns',
] as const;

export const photography = {
  eyebrow: 'Capturing moments & memories',
  heading: 'Professional Photography',
  body: 'Photography is at the heart of everything I do. It’s more than just my passion — it’s the foundation of my work and what drives me to excel in every project. I specialise in Product, Lifestyle, Music, Portrait, Wedding, and Property Photography, delivering high-quality images tailored to your needs. With a focus on vibrant, emotional, and warm visuals, I approach every shoot with creativity and dedication, ensuring that your vision is brought to life with precision and care.',
  categories: ['Portraits', 'Weddings', 'Property', 'Live Music', 'Product', 'Lifestyle'] as const,
  cta: { line: 'Let’s make your ideas & memories come to life!', label: 'Get started here' },
};

export const video = {
  eyebrow: 'Elevate your brand',
  heading: 'Marketing Video Creation',
  body: [
    'Creating stunning content for brands and agencies, and making high quality content accessible is my absolute passion. With over a decade of experience, we specialise in crafting beautiful video and still content that brings your brand to life.',
    'Since 2013, we’ve been perfecting the art of capturing everything our clients envision. Services include photography, videography, and copywriting. Whether you’re a large agency or a small business, we create content that truly represents your brand, making it shine in a competitive market.',
  ],
  // Rotation pool — newest 8 from the live profile (2026-07-06) + the 2 originals. Admin-curatable.
  tiktokIds: [
    '7635668370729225480',
    '7576347445815250183',
    '7575159926318697735',
    '7575150245516987655',
    '7547753654191705362',
    '7547722210073513234',
    '7542918804146507016',
    '7542797447093931282',
    '7293572260181429509',
    '7222594449979804933',
  ],
  cta: { line: 'Ready to create some amazing video content?', label: 'Get started here' },
};

export const marketing = {
  eyebrow: 'Strategic content for your brand',
  heading: 'Social Media Management',
  body: [
    'My social media management service is crafted to not only help you build but also sustain a powerful and lasting online presence. I take a strategic and customised approach to every client’s social media, carefully crafting content that is engaging, relevant, and tailored to resonate with your audience.',
    'Whether it’s curating daily posts that keep your brand top of mind, interacting with your audience through comments and messages, or running data-driven campaigns that deliver measurable results, I focus on strategies that keep your brand active, relevant, and thriving in an ever-evolving digital space.',
  ],
  processTitle: 'The Discovery Process',
  process: [
    {
      name: 'Strategy',
      text: 'Power up your business with a dynamic social media strategy to conquer your business goals and skyrocket your brand’s online presence.',
    },
    {
      name: 'Creation',
      text: 'Create brand-aligned content that captivates your audience, forming unbreakable brand loyalty. Organise this content into a strategic calendar for maximum success.',
    },
    {
      name: 'Posting & Management',
      text: 'Energise your online presence: deliver impactful content, vigilantly monitor responses, and actively engage with and manage your growing community.',
    },
    {
      name: 'Success',
      text: 'Unleash the power of data. We rigorously analyse performance metrics, decipher audience behaviours, and leverage insights to sharpen strategies and supercharge future content optimisation.',
    },
  ],
  cta: { line: 'Let’s create a powerful social media strategy', label: 'Get started here' },
};

export const influencer = {
  eyebrow: 'Amplify your brand’s reach',
  heading: 'Influencer Campaigns',
  body: [
    'Unlock your brand’s potential by partnering with me for your next influencer campaign! From unboxings and product reviews to customer experience videos, my content authentically connects with a loyal community that trusts my recommendations.',
    'Let’s showcase your business in a genuine way and elevate your brand beyond traditional advertising.',
  ],
  cta: { line: 'Time to unlock your brand’s potential!', label: 'Get started here' },
};

export const reviews = [
  {
    quote:
      'We have been using her content creation services for 8 years now and we have been super impressed with the fantastic quality photography, general turn around time of services and the passion and energy put into every project and would definitely recommend their services!',
    name: 'Keith Taeuber',
    org: 'School of Rock Claremont',
  },
  {
    quote:
      'She produces work that goes beyond expectations and has a passion for what she does. It is truly a pleasure to have her as a photographer.',
    name: 'Kai Coetzee',
    org: 'Leonista',
  },
  {
    quote:
      'Leigh-Anne is like a breath of fresh air in any shoot environment. Always there to accommodate in any way possible, always up beat & happy, always creating. Not only is she a total professional in her work ethic, but her career is her passion, & she will not rest until she’s completely happy with the finished product. She is reliable & always punctual, & you know that you can rely on her to always deliver what is expected in the end. I recommend her highly.',
    name: 'Paula Kelley',
    org: 'Left of Center',
  },
  {
    quote:
      'I have never met a more talented or dedicated photographer. Not only worth the money but she is willing to tailor the shoot and experience to you! She takes the time to get to know you as an artist and knows how to capture your essence. You will never be disappointed.',
    name: 'Stardust Productions',
    org: '',
  },
] as const;

export const contact = {
  phone: '+27 72 227 7016',
  phoneHref: 'tel:+27722277016',
  email: 'discoverwithleigh@gmail.com',
  studio: 'Century City, Cape Town, South Africa',
  whatsapp: 'http://wa.link/s5hdey',
  whatsappMessage: 'Hi Leigh-Anne! I found your website and would love to chat about a shoot/campaign.',
};
