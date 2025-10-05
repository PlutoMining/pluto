/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

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

  // primaryColor
  const [primaryColor] = useToken("colors", ["cta-bg"]);
  const [primaryColorHover] = useToken("colors", ["cta-bg-hover"]);

  return (
    <InputGroup height={"40px"}>
      <InputLeftElement pointerEvents="none">
        <SearchIcon color={primaryColor} />
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
          border: `1px solid ${primaryColor}`,
        }}
        _hover={{
          border: `1px solid ${primaryColorHover}`,
        }}
      />
    </InputGroup>
  );
};
