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
  flexDir?: any;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name,
  id,
  isChecked,
  onChange,
  defaultChecked,
  flexDir = "row",
}) => {
  const [borderColor] = useToken("colors", ["input-border-color"]);
  const [bgColor] = useToken("colors", ["bg-color"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [accentColor] = useToken("colors", ["input-accent-color"]);
  const [colorDisabled] = useToken("colors", ["radio-button-border-disabled"]);
  const [borderColorDisabled] = useToken("colors", ["radio-button-color-disabled"]);

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
          flexDir: flexDir,
          width: "100%",
          "& .chakra-checkbox__control": {
            height: "1rem",
            width: "1rem",
            borderRadius: 0,
            bg: "bgColor",
            borderColor: borderColor,
            boxShadow: `inset 0 0 0 1px ${bgColor}`,
          },
          "& .chakra-checkbox__control[data-checked]": {
            bg: accentColor,
            borderColor: borderColor,
            color: borderColor,
            boxShadow: `inset 0 0 0 1px ${bgColor}`,
          },
          "& .chakra-checkbox__control[data-checked]:hover": {
            bg: accentColor,
            borderColor: borderColor,
            color: borderColor,
            boxShadow: `inset 0 0 0 1px ${bgColor}`,
          },
          "& .chakra-checkbox__control:focus": {
            borderColor: borderColor,
            boxShadow: `inset 0 0 0 1px ${bgColor}`,
          },
        }}
      >
        <Text
          fontSize="sm"
          fontWeight={500}
          color={textColor}
          flexGrow={1}
          mr="0.5rem"
          fontFamily={"accent"}
        >
          {label}
        </Text>
      </ChakraCheckbox>
    </FormControl>
  );
};
