import { ChangeEventHandler } from "react";
import {
  FormControl,
  FormLabel,
  Select as ChakraSelect,
  useTheme,
} from "@chakra-ui/react";
import React from "react";

interface SelectProps {
  label: string;
  name: string;
  id: string;
  value?: string | number;
  optionValues: Array<{ value: string | number; label: string }>;
  onChange: ChangeEventHandler<HTMLSelectElement>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  name,
  id,
  value,
  optionValues,
  onChange,
}) => {
  const theme = useTheme();

  return (
    <FormControl>
      <FormLabel 
        htmlFor={name}
        fontWeight={400}
        fontSize={'13px'}
      >{label}</FormLabel>
      <ChakraSelect
        id={id}
        name={name}
        onChange={onChange}
        defaultValue={value}
        outline={"none"}
        backgroundColor={theme.colors.greyscale[0]}
        borderWidth={"1px"}
        borderColor={theme.colors.greyscale[400]}
        color={theme.colors.greyscale[900]}
        borderRadius={"6px"}
        height={"32px"}
        boxShadow={"none"}
        _focus={{
          outline: "none",
          boxShadow: "none",
          border: `2px solid ${theme.colors.greyscale[400]}`,
        }}
        _hover={{
          border: `2px solid ${theme.colors.greyscale[400]}`,
        }}
      >
        {optionValues.map((elem: { value: string | number; label: string }, index) => {
          return (
            <option key={`option-${index}-${elem.value}`} value={elem.value}>
              {elem.label}
            </option>
          );
        })}
      </ChakraSelect>
    </FormControl>
  );
};
