import { motion, type HTMLMotionProps } from 'framer-motion';

/** Fades/lifts content in once as it scrolls into view. Short and quiet by design. */
export function Reveal({ children, delay = 0, ...rest }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Staggered entrance for lists of cards: pass the item index. */
export function StaggerItem({ index, children, ...rest }: HTMLMotionProps<'div'> & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: Math.min(index, 8) * 0.05 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
