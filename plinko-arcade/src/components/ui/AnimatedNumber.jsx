import { useEffect, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';
import { fmt } from '../../utils/format';

// Smoothly counts from the previous value to the new one.
export default function AnimatedNumber({ value, format = fmt }) {
  const mv = useMotionValue(value);
  const [text, setText] = useState(() => format(value));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.45, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, mv]);

  useEffect(() => mv.on('change', (v) => setText(format(v))), [mv, format]);

  return <span>{text}</span>;
}
