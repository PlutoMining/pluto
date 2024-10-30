import { ChangeEventHandler } from "react";
import {
  Input as ChakraInput,
  InputGroup,
  InputLeftElement,
  useTheme,
  useToken,
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
  const [borderColor] = useToken("colors", ["border-color"]);
  const [bgColor] = useToken("colors", ["input-bg"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [accentColor] = useToken("colors", ["accent-color"]);

  return (
    <InputGroup>
      <InputLeftElement pointerEvents="none">
        <SearchIcon color={accentColor} />
      </InputLeftElement>
      <ChakraInput
        type={type}
        placeholder={placeholder}
        onChange={onChange}
        outline={"none"}
        backgroundColor={bgColor}
        borderWidth={"1px"}
        borderColor={borderColor}
        color={textColor}
        borderRadius={0}
        boxShadow={"none"}
        _placeholder={{
          color: textColor,
        }}
        _focus={{
          outline: "none",
          boxShadow: "none",
          border: `2px solid ${accentColor}`,
        }}
        _hover={{
          border: `2px solid ${accentColor}`,
        }}
      />
    </InputGroup>
  );
};
