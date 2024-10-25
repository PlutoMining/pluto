import { ChangeEvent } from "react";
import { FormControl, Checkbox as ChakraCheckbox, useTheme, Text } from "@chakra-ui/react";
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
  const theme = useTheme();

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
        size="lg"
        name={name}
        onChange={onChange}
        id={id}
        isChecked={isChecked}
        defaultChecked={defaultChecked}
        borderColor={theme.colors.greyscale[900]}
        borderRadius={"3px"}
        sx={{
          "& .chakra-checkbox__control": {
            bg: theme.colors.greyscale[0], // colore di sfondo (hex)
            borderColor: theme.colors.greyscale[900], // colore del bordo (hex)
          },
          "& .chakra-checkbox__control[data-checked]": {
            bg: theme.colors.brand.secondary, // colore quando è selezionato (checked)
            borderColor: theme.colors.greyscale[900], // colore bordo quando è selezionato
            color: theme.colors.greyscale[0], // colore di sfondo (hex)
            boxShadow: "inset 0 0 0 2px white", // spazio bianco tra bordo e riempimento
          },
          "& .chakra-checkbox__control[data-checked]:hover": {
            bg: theme.colors.brand.secondary, // colore quando è selezionato (checked)
            borderColor: theme.colors.greyscale[900], // colore bordo quando è selezionato
            color: theme.colors.greyscale[0], // colore di sfondo (hex)
            boxShadow: "inset 0 0 0 2px white", // spazio bianco tra bordo e riempimento
          },
          "& .chakra-checkbox__control:focus": {
            borderColor: theme.colors.brand.primary, // colore del bordo quando la checkbox è in focus
            boxShadow: `0 0 0 2px ${theme.colors.brand.primary}`, // effetto di ombra quando è in focus
          },
        }}
      >
        <Text fontSize={getFontSize(size)}>{label}</Text>
      </ChakraCheckbox>
    </FormControl>
  );
};
