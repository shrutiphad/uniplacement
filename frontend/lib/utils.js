import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return 'TBD';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatPackage(pkg) {
  if (!pkg) return 'Not disclosed';
  return pkg;
}

export const STATUS_COLORS = {
  Applied:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Under Review': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Shortlisted:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Selected:     'bg-green-500/10 text-green-400 border-green-500/20',
  Rejected:     'bg-red-500/10 text-red-400 border-red-500/20',
};

export const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics',
  'Mechanical', 'Civil', 'Chemical', 
];

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export function getFitScoreColor(score) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

export function getFitScoreBg(score) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}