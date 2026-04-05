import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import GeneratedImage from './GeneratedImage';

export default function About() {
  return (
    <section id="about" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Text Content */}
          <div className="lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h4 className="text-gold uppercase tracking-[0.3em] font-mono text-xs mb-4">Our story</h4>
              <h2 className="text-4xl md:text-5xl font-serif mb-6">Few words about us</h2>
              <div className="dots-separator !justify-start mb-8">
                <span />
              </div>
              
              <div className="space-y-6 text-gray-600 leading-relaxed">
                <p>
                  Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam aperiam. Eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt.
                </p>
                <p>
                  Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.
                </p>
              </div>

              <div className="mt-10">
                <a 
                  href="#menu" 
                  className="inline-flex items-center gap-3 bg-dark text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-gold transition-all group"
                >
                  Explore Our Menu
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </motion.div>
          </div>

          {/* Image Collage */}
          <div className="lg:w-1/2 relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              {/* Main Image */}
              <div className="relative z-10 p-4 bg-white shadow-2xl">
                <GeneratedImage 
                  prompt="Modern restaurant interior with minimalist design, natural light, wooden accents"
                  className="w-full h-auto"
                />
              </div>
              
              {/* Floating Image */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.3 }}
                className="absolute -top-10 -right-10 w-2/3 z-20 p-3 bg-white shadow-2xl hidden md:block"
              >
                <GeneratedImage 
                  prompt="Professional chef plating a gourmet dish in a clean kitchen"
                  className="w-full h-auto"
                />
              </motion.div>

              {/* Decorative Cube */}
              <motion.div 
                animate={{ 
                  y: [0, -20, 0],
                  rotate: [0, 10, 0]
                }}
                transition={{ repeat: Infinity, duration: 5 }}
                className="absolute -bottom-10 -left-10 w-32 z-30 hidden md:block"
              >
                <img src="https://restabook.kwst.net/images/cube.png" alt="" referrerPolicy="no-referrer" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[url('https://restabook.kwst.net/images/wave-bg.png')] bg-no-repeat bg-right-top opacity-10 pointer-events-none" />
    </section>
  );
}
