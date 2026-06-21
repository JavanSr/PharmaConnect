// Browser process polyfill must be the first import so it runs before Next.js packages
import './process-polyfill';

// Design sync barrel — re-exports all website components for the APOTEKH Design System
export { default as Button } from './components/ui/Button';
export { default as Badge } from './components/ui/Badge';
export { default as AnimatedSection } from './components/ui/AnimatedSection';
export { default as StatCard } from './components/ui/StatCard';
export { default as AppMockup } from './components/AppMockup';
export { default as ContactForm } from './components/ContactForm';
export { default as ContactTabs } from './components/ContactTabs';
export { default as FaqAccordion } from './components/FaqAccordion';
export { default as Footer } from './components/Footer';
export { default as Logo } from './components/Logo';
export { default as ModuleCard } from './components/ModuleCard';
export { default as Nav } from './components/Nav';
export { default as PlatformGrid } from './components/PlatformGrid';
export { default as PricingCard } from './components/PricingCard';
export { default as PricingToggle } from './components/PricingToggle';
