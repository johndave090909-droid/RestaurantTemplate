import React from 'react';
import { motion } from 'motion/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import GeneratedImage from './GeneratedImage';

import 'swiper/css';
import 'swiper/css/navigation';

const events = [
  {
    title: 'Jazz Band Live Event',
    date: '25 may 2020',
    description: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam aperiam.'
  },
  {
    title: 'Wine and Steak Day',
    date: '19 June 2020',
    description: 'In ut odio libero, at vulputate urna. Nulla tristique mi a massa convallis cursus. Nulla eu mi magna. Etiam suscipit gravida.'
  },
  {
    title: 'Freedom Day Celebration',
    date: '14 October 2020',
    description: 'Lorem Ipsum generators on the Internet king this the first true generator laudantium totam aperiam.'
  }
];

export default function Events({ onOpenReservation }: { onOpenReservation: () => void }) {
  return (
    <section className="flex flex-col lg:flex-row min-h-[600px]">
      {/* Left Column: Store Promo */}
      <div className="lg:w-1/2 relative min-h-[400px] lg:min-h-auto overflow-hidden group">
        <div className="absolute inset-0 z-0 transition-transform duration-1000 group-hover:scale-110">
          <GeneratedImage 
            prompt="High-end deli or gourmet food store interior, shelves with premium products"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 z-10" />
        </div>
        
        <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-12 py-20 text-white">
          <h3 className="text-4xl md:text-5xl font-serif mb-4">Our Store</h3>
          <h4 className="text-gold text-lg font-serif mb-10">Want to order food home? Visit our online store.</h4>
          <a 
            href="#shop" 
            className="inline-flex items-center gap-3 bg-white text-dark px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-gold hover:text-white transition-all group"
          >
            Buy online
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>

      {/* Right Column: Events Carousel */}
      <div className="lg:w-1/2 bg-dark text-white relative overflow-hidden flex flex-col items-center justify-center px-12 py-20">
        <div className="relative z-20 w-full max-w-lg text-center">
          <h4 className="text-gold uppercase tracking-[0.3em] font-mono text-xs mb-4">Book a table</h4>
          <h2 className="text-4xl md:text-5xl font-serif mb-8">Upcoming Events</h2>
          <div className="dots-separator mb-12">
            <span />
          </div>

          <div className="relative px-12">
            <Swiper
              modules={[Autoplay, Navigation]}
              autoplay={{ delay: 5000 }}
              navigation={{
                prevEl: '.event-prev',
                nextEl: '.event-next',
              }}
              loop={true}
              className="w-full"
            >
              {events.map((event, index) => (
                <SwiperSlide key={index}>
                  <div className="py-4">
                    <h4 className="text-2xl font-serif text-white mb-2">{event.title}</h4>
                    <span className="text-gold font-mono text-xs uppercase tracking-widest mb-6 block">{event.date}</span>
                    <p className="text-gray-400 leading-relaxed italic">
                      {event.description}
                    </p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Custom Navigation */}
            <button className="event-prev absolute left-0 top-1/2 -translate-y-1/2 text-white/30 hover:text-gold transition-colors z-30">
              <ChevronLeft size={32} />
            </button>
            <button className="event-next absolute right-0 top-1/2 -translate-y-1/2 text-white/30 hover:text-gold transition-colors z-30">
              <ChevronRight size={32} />
            </button>
          </div>

          <div className="mt-12 pt-12 border-t border-white/10">
            <button 
              onClick={onOpenReservation}
              className="inline-flex items-center gap-3 bg-gold text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-dark transition-all group"
            >
              Book Table Now
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Decorative Background Image */}
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 opacity-10 pointer-events-none">
          <img 
            src="https://restabook.kwst.net/images/bg/dec/6.png" 
            alt="" 
            className="w-full h-full object-contain object-right-bottom"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </section>
  );
}
