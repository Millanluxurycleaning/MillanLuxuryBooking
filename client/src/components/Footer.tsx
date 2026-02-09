import { SiFacebook, SiGoogle, SiInstagram, SiYelp } from "react-icons/si";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const googleBusinessUrl = "https://www.google.com/maps/search/?api=1&query=Millan%20Luxury%20Cleaning%20Phoenix%20AZ";
  const facebookUrl = "https://www.facebook.com/search/top/?q=Millan%20Luxury%20Cleaning";

  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-8">
          {/* About Column */}
          <div>
            <h3 className="font-serif text-xl font-semibold mb-4">Millan Luxury Cleaning</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              High-end home cleaning services in Phoenix, AZ. We deliver precision, care, 
              and a dedication to creating peaceful, luxurious spaces.
            </p>
          </div>

          {/* Quick Links Column */}
          <div>
            <h3 className="font-serif text-xl font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#about" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  data-testid="link-footer-about"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="/services"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  data-testid="link-footer-services"
                >
                  Our Services
                </a>
              </li>
              <li>
                <a
                  href="/fragrances"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  data-testid="link-footer-fragrances"
                >
                  Fragrances
                </a>
              </li>
              <li>
                <a
                  href="#gallery"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  data-testid="link-footer-gallery"
                >
                  Gallery
                </a>
              </li>
              <li>
                <a 
                  href="#testimonials" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  data-testid="link-footer-testimonials"
                >
                  Testimonials
                </a>
              </li>
              <li>
                <a 
                  href="#contact" 
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  data-testid="link-footer-contact"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Social Column */}
          <div>
            <h3 className="font-serif text-xl font-semibold mb-4">Connect With Us</h3>
            <div className="space-y-3 mb-6">
              <p className="text-muted-foreground text-sm">
                <a href="tel:6619418765" className="hover:text-primary transition-colors">
                  (661) 941-8765
                </a>
              </p>
              <p className="text-muted-foreground text-sm">
                <a 
                  href="mailto:info@millanluxurycleaning.com" 
                  className="hover:text-primary transition-colors break-all"
                >
                  info@millanluxurycleaning.com
                </a>
              </p>
              <p className="text-muted-foreground text-sm">
                Phoenix, AZ 85004
              </p>
            </div>

            {/* Social Icons */}
            <div className="flex gap-4">
              <a
                href={googleBusinessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-accent hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Google Business Profile"
                data-testid="link-social-google"
              >
                <SiGoogle className="w-5 h-5" />
              </a>
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-accent hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
                data-testid="link-social-facebook"
              >
                <SiFacebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/millan_luxury_cleaning/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-accent hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
                data-testid="link-social-instagram"
              >
                <SiInstagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.yelp.com/biz/millan-luxury-cleaning-phoenix"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-accent hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Yelp"
                data-testid="link-social-yelp"
              >
                <SiYelp className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              © {currentYear} Millan Luxury Cleaning. All rights reserved.
            </p>
            <a 
              href="https://giddyupp.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors text-sm"
              data-testid="link-built-by-giddyupp"
            >
              Built by GiddyUpp
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
