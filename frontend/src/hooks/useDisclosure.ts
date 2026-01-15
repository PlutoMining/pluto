import { useCallback, useState } from "react";

export function useDisclosure(options?: { defaultIsOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(Boolean(options?.defaultIsOpen));

  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  const onToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, onOpen, onClose, onToggle, setIsOpen };
}

