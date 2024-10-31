import { ChangeEvent } from "react";
import { FormControl, Checkbox as ChakraCheckbox, Text, useToken, Flex } from "@chakra-ui/react";
import React from "react";

interface CheckboxProps {
  id: string;
  name: string;
  label?: string;
  isChecked?: boolean;
  defaultChecked?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name,
  id,
  isChecked,
  onChange,
  defaultChecked,
}) => {
  const [borderColor] = useToken("colors", ["border-color"]);
  const [inputColor] = useToken("colors", ["input-bg"]);

  const [bgColor] = useToken("colors", ["td-bg"]);

  const [textColor] = useToken("colors", ["body-text"]);
  const [accentColor] = useToken("colors", ["cta-bg"]);
  const [accentColorHover] = useToken("colors", ["cta-bg-hover"]);

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
            height: "1rem",
            width: "1rem",
            borderRadius: 0,
            bg: "bgColor",
            borderColor: borderColor,
          },
          "& .chakra-checkbox__control[data-checked]": {
            bg: accentColor,
            borderColor: borderColor,
            color: borderColor,
          },
          "& .chakra-checkbox__control[data-checked]:hover": {
            bg: accentColor,
            borderColor: borderColor,
            color: borderColor,
          },
          "& .chakra-checkbox__control:focus": {
            borderColor: borderColor,
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
