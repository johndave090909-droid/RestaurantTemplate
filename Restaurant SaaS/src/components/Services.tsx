import React from 'react';
import { motion } from 'motion/react';
import { Fish, Carrot, Utensils, ArrowRight } from 'lucide-react';
import GeneratedImage from './GeneratedImage';

const services = [
  {
    id: '01.',
    title: 'Daily New Fresh Menus',
    subtitle: 'Start eating better',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas in pulvinar neque. Nulla finibus lobortis pulvinar.',
    icon: <Fish size={40} />,
    prompt: 'Fresh gourmet seafood dish, beautifully plated, high-end restaurant style'
  },
  {
    id: '02.',
    title: 'Fresh Ingredient, Tasty Meals',
    subtitle: 'Quality is the heart',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas in pulvinar neque. Nulla finibus lobortis pulvinar.',
    icon: <Carrot size={40} />,
    prompt: 'Assortment of fresh organic vegetables and herbs on a rustic wooden table'
  },
  {
    id: '03.',
    title: 'Creative & Talented Chefs',
    subtitle: 'Hot & ready to serve',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas in pulvinar neque. Nulla finibus lobortis pulvinar.',
    icon: <Utensils size={40} />,
    prompt: 'Professional chef in white uniform working in a high-tech kitchen'
  }
];

export default function Services() {
  return (
    <section className="py-24 relative overflow-hidden bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h4 className="text-gold uppercase tracking-[0.3em] font-mono text-xs mb-4">Why people choose us</h4>
          <h2 className="text-4xl md:text-5xl font-serif mb-6">Prepare for first-class service</h2>
          <div className="dots-separator">
            <span />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="group perspective-1000 h-[400px]"
            >
              <div className="relative w-full h-full transition-all duration-700 preserve-3d group-hover:rotate-y-180">
                {/* Front Face */}
                <div className="absolute inset-0 backface-hidden">
                  <div className="relative h-full w-full overflow-hidden">
                    <GeneratedImage 
                      prompt={service.prompt}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-white">
                      <h2 className="text-2xl font-serif mb-2">{service.title}</h2>
                      <h4 className="text-gold text-xs uppercase tracking-widest">{service.subtitle}</h4>
                    </div>
                    <div className="absolute top-6 left-6 text-white/50 font-mono text-xl">{service.id}</div>
                  </div>
                </div>

                {/* Back Face */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white shadow-xl flex items-center justify-center text-center p-10 border border-gray-100">
                  <div className="flex flex-col items-center">
                    <div className="text-gold mb-6">
                      {service.icon}
                    </div>
                    <p className="text-gray-600 leading-relaxed mb-6">
                      {service.description}
                    </p>
                    <div className="w-12 h-[1px] bg-gold" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <a 
            href="#about" 
            className="inline-flex items-center gap-3 border border-dark text-dark px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-dark hover:text-white transition-all group"
          >
            Read More About us
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5">
        <img src="https://restabook.kwst.net/images/bg/dec/section-bg.png" alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
    </section>
  );
}
