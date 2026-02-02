import { Card } from "@/components/ui/card";
import { useAssets } from "@/hooks/useAssets";

const fallbackBackground = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/light-botanical-bg.png";
const fallbackPortrait = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/owner-photo.jpg";

export function About() {
  const { data: assets = {} } = useAssets();
  const background = assets?.aboutBackground?.url ?? fallbackBackground;
  const portrait = assets?.aboutPortrait?.url ?? fallbackPortrait;

  return (
    <section
      id="about"
      className="relative py-20 md:py-32 overflow-hidden"
      style={{
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      <div className="relative z-10 container mx-auto px-6 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Section Title */}
          <h2 className="font-serif text-3xl md:text-5xl font-semibold text-center mb-4">
            About Millan Luxury Cleaning
          </h2>
          <p className="text-lg md:text-xl text-center text-muted-foreground mb-12 italic">
            A clean space should feel intentional, elevated, and cared for.
          </p>
          
          {/* Content Card with Owner Photo */}
          <Card className="p-8 md:p-12 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Photo */}
              <div className="flex justify-center md:justify-start">
                <div className="w-full max-w-sm rounded-lg overflow-hidden shadow-md">
                  <img
                    src={portrait}
                    alt="Ivan Millan, Founder of Millan Luxury Cleaning"
                    className="w-full h-auto object-cover"
                    data-testid="img-owner-photo"
                  />
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-4 italic text-foreground">
                <p className="text-base md:text-lg leading-relaxed">
                  Millan Luxury Cleaning Co. was founded with one simple belief:
                  a clean space should feel intentional, elevated, and cared for.
                </p>

                <p className="text-base md:text-lg leading-relaxed">
                  What began as a passion for creating calm, pristine environments evolved into a
                  full-service cleaning company built on trust, quality, and attention to detail.
                </p>

                <p className="text-base md:text-lg leading-relaxed">
                  Every service is completed with care and pride, as if it were our own home —
                  because luxury lives in the details.
                </p>

                <p className="text-primary font-semibold text-base md:text-lg">
                  — Ivan Millan, Founder
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
