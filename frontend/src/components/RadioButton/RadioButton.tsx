import { Radio as ChakraRadio, useTheme, useToken } from "@chakra-ui/react";
import React from "react";

interface RadioButtonProps {
  id: string;
  value: string;
  label: string;
  disabled?: boolean;
}

export const RadioButton: React.FC<RadioButtonProps> = ({ label, value, id, disabled }) => {
  const [borderColor] = useToken("colors", ["border-color"]);
  const [accentColor] = useToken("colors", ["accent-color"]);

  return (
    <ChakraRadio
      value={value}
      id={id}
      _checked={{
        bg: accentColor,
        borderColor: borderColor,
      }}
      isDisabled={disabled}
      _disabled={{
        opacity: 0.5,
      }}
    >
      {label}
    </ChakraRadio>
  );
};
