import React from 'react';
import { motion } from 'motion/react';
import { Quote } from 'lucide-react';
import GeneratedImage from './GeneratedImage';

export default function OpeningHours() {
  return (
    <section className="flex flex-col lg:flex-row min-h-[600px]">
      {/* Left Column: Quote */}
      <div className="lg:w-1/2 relative min-h-[400px] lg:min-h-auto overflow-hidden">
        <div className="absolute inset-0 z-0">
          <GeneratedImage 
            prompt="Atmospheric restaurant interior at night, dim warm lighting, cozy corner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 z-10" />
        </div>
        
        <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-12 py-20 text-white">
          <Quote size={48} className="text-gold mb-8 opacity-50" />
          <p className="text-xl md:text-2xl font-serif italic mb-10 leading-relaxed">
            "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi accusantium."
          </p>
          <div className="mb-4">
            <img 
              src="https://restabook.kwst.net/images/signature.png" 
              alt="Signature" 
              className="mx-auto brightness-0 invert"
              referrerPolicy="no-referrer"
            />
          </div>
          <h4 className="text-gold font-serif text-lg">Kevin Kowalsky</h4>
          <span className="text-xs uppercase tracking-widest text-gray-400">Restaurant’s Chef</span>
        </div>
      </div>

      {/* Right Column: Opening Hours */}
      <div className="lg:w-1/2 bg-dark text-white relative overflow-hidden flex flex-col items-center justify-center px-12 py-20">
        <div className="relative z-20 w-full max-w-md text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h4 className="text-gold uppercase tracking-[0.3em] font-mono text-xs mb-4">Call For Reservations</h4>
            <h2 className="text-4xl md:text-5xl font-serif mb-8">Opening Hours</h2>
            <div className="dots-separator mb-12">
              <span />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
              <div>
                <h3 className="text-xl font-serif mb-4">Sunday to Tuesday</h3>
                <div className="text-3xl font-mono text-gold">
                  09:00 <br /> 22:00
                </div>
              </div>
              <div>
                <h3 className="text-xl font-serif mb-4">Friday to Saturday</h3>
                <div className="text-3xl font-mono text-gold">
                  11:00 <br /> 19:00
                </div>
              </div>
            </div>

            <div className="h-[1px] w-full bg-white/10 mb-12" />
            
            <div className="text-4xl md:text-5xl font-serif text-white hover:text-gold transition-colors cursor-pointer">
              <a href="tel:+7111123456789">+7(111)123456789</a>
            </div>
          </motion.div>
        </div>

        {/* Decorative Background Image */}
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 opacity-10 pointer-events-none">
          <img 
            src="https://restabook.kwst.net/images/bg/dec/7.png" 
            alt="" 
            className="w-full h-full object-contain object-right-bottom"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </section>
  );
}
