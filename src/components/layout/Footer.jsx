import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Mail, Zap } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { name: 'Features', path: '/#features' },
      { name: 'Roadmap Generator', path: '/roadmap' },
      { name: 'Mock Interviews', path: '/mock-interview' },
      { name: 'Code Playground', path: '/code-playground' },
    ],
    Resources: [
      { name: 'Documentation', path: '/docs' },
      { name: 'Tutorials', path: '/tutorials' },
      { name: 'Blog', path: '/blog' },
      { name: 'Community', path: '/community' },
    ],
    Company: [
      { name: 'About', path: '/about' },
      { name: 'Contact', path: '/contact' },
      { name: 'Privacy Policy', path: '/privacy' },
      { name: 'Terms of Service', path: '/terms' },
    ],
  };

  return (
    <footer className="glass-strong border-t border-white/10 mt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center glow">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text-blue">
                PrepForge
              </span>
            </Link>
            <p className="text-gray-400 text-sm mb-4 max-w-sm">
              AI-Powered Interview Preparation Platform with Adaptive Learning.
              Master your interviews with personalized roadmaps, adaptive questions,
              and stunning visualizations.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg glass hover:glass-strong transition-all duration-300 hover:scale-110"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg glass hover:glass-strong transition-all duration-300 hover:scale-110"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg glass hover:glass-strong transition-all duration-300 hover:scale-110"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="mailto:contact@prepforge.com"
                className="p-2 rounded-lg glass hover:glass-strong transition-all duration-300 hover:scale-110"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white font-semibold mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className="text-gray-400 text-sm hover:text-blue-400 transition-all duration-300"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © {currentYear} PrepForge. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm">
              Built with React, GSAP, Tailwind, and ❤️
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
