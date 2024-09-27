import { ChangeEventHandler } from "react";
import {
  Input as ChakraInput,
  InputGroup,
  InputLeftElement,
  useTheme,
} from "@chakra-ui/react";
import React from "react";
import { SearchIcon } from "../icons/SearchIcon";

interface SearchInputProps {
  label: string;
  type?: "text" | "number" | "password";
  placeholder?: string;
  defaultValue?: string | number;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder,
  type = "text",
  onChange,
}) => {
  const theme = useTheme();

  return (
    <InputGroup>
      <InputLeftElement pointerEvents='none'>
        <SearchIcon color={theme.colors.greyscale[900]} />
      </InputLeftElement>
      <ChakraInput
        type={type} 
        placeholder={placeholder}
        onChange={onChange}
        outline={"none"}
        backgroundColor={theme.colors.greyscale[0]}
        borderWidth={"1px"}
        borderColor={theme.colors.greyscale[500]}
        color={theme.colors.greyscale[900]}
        borderRadius={"4px"}
        boxShadow={"none"}
        _placeholder={{
          color: theme.colors.greyscale[500],
        }}
        _focus={{
          outline: "none",
          boxShadow: "none",
          border: `2px solid ${theme.colors.brand.secondary}`,
        }}
        _hover={{
          border: `2px solid ${theme.colors.greyscale[500]}`,
        }}
      />
    </InputGroup>
  );
};
