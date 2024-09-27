import { Radio as ChakraRadio, useTheme } from "@chakra-ui/react";
import React from "react";

interface RadioButtonProps {
  id: string;
  value: string;
  label: string;
  disabled?: boolean;
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  label,
  value,
  id,
  disabled
}) => {

  const theme = useTheme();

  return (
    <ChakraRadio 
      value={value}
      id={id}
      _checked={{
        bg: theme.colors.brand.secondary,  // colore del riempimento
        borderColor: theme.colors.greyscale[900],  // colore del bordo
        boxShadow: 'inset 0 0 0 2px white',  // spazio tra bordo e riempimento
      }}
      isDisabled={disabled}
      _disabled={{
        bg: theme.colors.greyscale[0],  // colore del riempimento
        borderColor: theme.colors.greyscale[200],  // colore del bordo
      }}
    >{label}</ChakraRadio>
  );
};