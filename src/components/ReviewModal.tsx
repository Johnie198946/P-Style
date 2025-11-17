import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ReviewSection } from './sections/ReviewSection';

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  data: any;
}