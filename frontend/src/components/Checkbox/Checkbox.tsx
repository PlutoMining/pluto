import { ChangeEvent } from "react";
import { FormControl, Checkbox as ChakraCheckbox, Text, useToken, Flex } from "@chakra-ui/react";
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
          display: "flex",
          alignItems: "center",
          width: "100%",
          "& .chakra-checkbox__control": {
            height: "20px",
            width: "20px",
            borderRadius: 0,
            bg: bgColor,
            borderColor: borderColor,
          },
          "& .chakra-checkbox__control[data-checked]": {
            bg: bgColor,
            borderColor: accentColor,
            color: accentColor,
            boxShadow: `inset 0 0 0 2px ${bgColor}`,
          },
          "& .chakra-checkbox__control[data-checked]:hover": {
            bg: bgColor,
            borderColor: accentColor,
            color: accentColor,
            boxShadow: `inset 0 0 0 2px ${bgColor}`,
          },
          "& .chakra-checkbox__control:focus": {
            borderColor: textColor,
            boxShadow: `0 0 0 2px ${textColor}`,
          },
        }}
      >
        <Text fontSize="md" color={textColor} flexGrow={1}>
          {label}
        </Text>
      </ChakraCheckbox>
    </FormControl>
  );
};
