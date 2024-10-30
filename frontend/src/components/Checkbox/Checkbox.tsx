import { ChangeEvent } from "react";
import { FormControl, Checkbox as ChakraCheckbox, Text, useToken } from "@chakra-ui/react";
import React from "react";

interface CheckboxProps {
  id: string;
  name: string;
  label?: string;
  isChecked?: boolean;
  defaultChecked?: boolean;
  size?: "sm" | "md";
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name,
  id,
  isChecked,
  onChange,
  defaultChecked,
  size,
}) => {
  const [borderColor] = useToken("colors", ["border-color"]);
  const [bgColor] = useToken("colors", ["input-bg"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [accentColor] = useToken("colors", ["accent-color"]);

  const getFontSize = (size: any) => {
    switch (size) {
      case "sm":
        return "13px";
      case "md":
        return "14px";
      default:
        return "13px";
    }
  };

  return (
    <FormControl>
      <ChakraCheckbox
        name={name}
        onChange={onChange}
        id={id}
        isChecked={isChecked}
        defaultChecked={defaultChecked}
        borderColor={borderColor}
        borderRadius={0}
        sx={{
          height: "20px", // Imposta l'altezza
          width: "20px", // Imposta la larghezza
          borderRadius: 0,
          "& .chakra-checkbox__control": {
            height: "20px", // Altezza del controllo
            width: "20px", // Larghezza del controllo
            borderRadius: 0,
            bg: bgColor, // colore di sfondo (hex)
            borderColor: borderColor, // colore del bordo (hex)
          },
          "& .chakra-checkbox__control[data-checked]": {
            bg: bgColor, // colore quando è selezionato (checked)
            borderColor: accentColor, // colore bordo quando è selezionato
            color: accentColor, // colore di sfondo (hex)
            boxShadow: `inset 0 0 0 2px ${bgColor}`, // spazio bianco tra bordo e riempimento
          },
          "& .chakra-checkbox__control[data-checked]:hover": {
            bg: bgColor, // colore quando è selezionato (checked)
            borderColor: accentColor, // colore bordo quando è selezionato
            color: accentColor, // colore di sfondo (hex)
            boxShadow: `inset 0 0 0 2px ${bgColor}`, // spazio bianco tra bordo e riempimento
          },
          "& .chakra-checkbox__control:focus": {
            borderColor: textColor, // colore del bordo quando la checkbox è in focus
            boxShadow: `0 0 0 2px ${textColor}`, // effetto di ombra quando è in focus
          },
        }}
      >
        <Text fontSize={getFontSize(size)}>{label}</Text>
      </ChakraCheckbox>
    </FormControl>
  );
};
