import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import GeneratedImage from './GeneratedImage';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

const reviews = [
  {
    name: 'Andy Dimasky',
    rating: 5,
    text: '"Vestibulum orci felis, ullamcorper non condimentum non, ultrices ac nunc. Mauris non ligula suscipit, vulputate mi accumsan, dapibus felis. Nullam sed sapien dui. Nulla auctor sit amet sem non porta. "',
    prompt: 'Portrait of a middle-aged man, friendly expression, professional look',
    num: '01.'
  },
  {
    name: 'Frank Dellov',
    rating: 4,
    text: '"Vestibulum orci felis, ullamcorper non condimentum non, ultrices ac nunc. Mauris non ligula suscipit, vulputate mi accumsan, dapibus felis. Nullam sed sapien dui. Nulla auctor sit amet sem non porta. "',
    prompt: 'Portrait of a young man, stylish, urban background',
    num: '02.'
  },
  {
    name: 'Centa Simpson',
    rating: 5,
    text: '"Vestibulum orci felis, ullamcorper non condimentum non, ultrices ac nunc. Mauris non ligula suscipit, vulputate mi accumsan, dapibus felis. Nullam sed sapien dui. Nulla auctor sit amet sem non porta. "',
    prompt: 'Portrait of a young woman, elegant, soft lighting',
    num: '03.'
  },
  {
    name: 'Nicolo Svensky',
    rating: 5,
    text: '"Vestibulum orci felis, ullamcorper non condimentum non, ultrices ac nunc. Mauris non ligula suscipit, vulputate mi accumsan, dapibus felis. Nullam sed sapien dui. Nulla auctor sit amet sem non porta. "',
    prompt: 'Portrait of an older man, sophisticated, library background',
    num: '04.'
  }
];

export default function Reviews() {
  return (
    <section className="py-24 relative overflow-hidden bg-white">
      <div className="brush-dec2 brush-dec_bottom opacity-10" />
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h4 className="text-gold uppercase tracking-[0.3em] font-mono text-xs mb-4">What said about us</h4>
          <h2 className="text-4xl md:text-5xl font-serif mb-6">Customer Reviews</h2>
          <div className="dots-separator">
            <span />
          </div>
        </div>

        <div className="relative px-4 md:px-16">
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            autoplay={{ delay: 6000 }}
            pagination={{ clickable: true, el: '.review-pagination' }}
            navigation={{
              prevEl: '.review-prev',
              nextEl: '.review-next',
            }}
            loop={true}
            breakpoints={{
              640: { slidesPerView: 1 },
              1024: { slidesPerView: 2, spaceBetween: 30 },
              1280: { slidesPerView: 3, spaceBetween: 40 }
            }}
            className="pb-16"
          >
            {reviews.map((review, index) => (
              <SwiperSlide key={index}>
                <div className="bg-gray-50 p-10 relative group hover:bg-dark transition-all duration-500">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      <GeneratedImage 
                        prompt={review.prompt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif group-hover:text-white transition-colors">{review.name}</h3>
                      <div className="flex gap-1 text-gold">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 italic leading-relaxed group-hover:text-white/70 transition-colors mb-6">
                    {review.text}
                  </p>
                  
                  <span className="absolute top-6 right-8 text-gold/20 font-mono text-4xl group-hover:text-gold/40 transition-colors">
                    {review.num}
                  </span>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Custom Navigation */}
          <button className="review-prev absolute left-0 top-1/2 -translate-y-1/2 text-dark/20 hover:text-gold transition-colors z-30 hidden md:block">
            <ChevronLeft size={48} />
          </button>
          <button className="review-next absolute right-0 top-1/2 -translate-y-1/2 text-dark/20 hover:text-gold transition-colors z-30 hidden md:block">
            <ChevronRight size={48} />
          </button>
          
          {/* Custom Pagination */}
          <div className="review-pagination flex justify-center gap-2 mt-8" />
        </div>
      </div>
    </section>
  );
}
