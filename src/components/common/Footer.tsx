import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div>
            <h2 className="text-xl font-bold mb-4">Task Generator</h2>
            <p className="text-muted-foreground">
              An online platform for generating and managing educational tasks with integrated assessment tools.
            </p>
          </div>
          
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/library" className="text-muted-foreground hover:text-primary transition-colors">
                  Task Library
                </Link>
              </li>
              <li>
                <Link to="/sheets" className="text-muted-foreground hover:text-primary transition-colors">
                  Task Sheets
                </Link>
              </li>
            </ul>
          </div>
          
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/generate-task" className="text-muted-foreground hover:text-primary transition-colors">
                  Generate Tasks
                </Link>
              </li>
              <li>
                <Link to="/generate-exam" className="text-muted-foreground hover:text-primary transition-colors">
                  Generate Exams
                </Link>
              </li>
            </ul>
          </div>
          
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Connect</h3>
            <div className="flex space-x-4">
              <a href="https://github.com/Bixen7135/XPP" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="w-6 h-6" />
              </a>
              <a href="mailto:support@taskgenerator.com" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </div>
      
      
      <div className="border-t border-border py-6">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="text-muted-foreground text-sm mb-4 md:mb-0">
            © {currentYear} Exam Preparation Platform. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}; 