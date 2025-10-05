/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { ChangeEventHandler } from "react";
import {
  FormControl,
  FormLabel,
  Input as ChakraInput,
  InputRightAddon,
  InputLeftAddon,
  InputGroup,
  useToken,
} from "@chakra-ui/react";
import React from "react";

interface InputProps {
  label?: string;
  name: string;
  id: string;
  type?: "text" | "number" | "password";
  placeholder?: string;
  defaultValue?: string | number;
  value?: string | number;
  pattern?: string;
  error?: string;
  isInvalid?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  leftAddon?: string;
  rightAddon?: string;
  isDisabled?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  name,
  id,
  type = "text",
  defaultValue,
  value,
  pattern,
  onChange,
  error,
  leftAddon,
  rightAddon,
  isDisabled,
}) => {
  const [borderColor] = useToken("colors", ["border-color"]);
  const [bgColor] = useToken("colors", ["input-bg"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [rightAddonBg] = useToken("colors", ["input-right-bg"]);
  const [errorColor] = useToken("colors", ["error-color"]);
  const [inputLabelColor] = useToken("colors", ["input-label-color"]);
  const [inputPlaceholderColor] = useToken("colors", ["input-placeholder-color"]);
  const [inputDisabledColor] = useToken("colors", ["input-disabled-color"]);
  const [inputDisabledBg] = useToken("colors", ["input-disabled-bg"]);

  // primaryColor
  const [primaryColor] = useToken("colors", ["cta-bg"]);
  const [primaryColorHover] = useToken("colors", ["cta-bg-hover"]);

  return (
    <FormControl>
      {label && (
        <FormLabel
          htmlFor={name}
          fontWeight={600}
          fontSize={"xs"}
          margin={"4px 0"}
          fontFamily={"body"}
          textTransform={"uppercase"}
          color={inputLabelColor}
        >
          {label}
        </FormLabel>
      )}
      <InputGroup>
        {leftAddon && <InputLeftAddon>{leftAddon}</InputLeftAddon>}
        <ChakraInput
          fontFamily={"accent"}
          fontWeight={400}
          fontSize={"13px"}
          id={id}
          name={name}
          placeholder={placeholder}
          defaultValue={defaultValue}
          onChange={onChange}
          type={type}
          outline={"none"}
          backgroundColor={bgColor}
          borderWidth={"1px"}
          borderColor={borderColor}
          color={textColor}
          borderRadius={0}
          padding={"1rem"}
          height={"40px"}
          boxShadow={"none"}
          pattern={pattern}
          _placeholder={{
            color: inputPlaceholderColor,
          }}
          _hover={{
            borderColor: primaryColorHover,
            borderWidth: "1px",
          }}
          _focus={{
            outline: "none",
            boxShadow: "none",
            borderColor: primaryColor,
            borderWidth: "1px",
          }}
          isInvalid={!!error}
          _invalid={{
            borderColor: errorColor,
            borderWidth: "1px",
          }}
          _disabled={{
            borderColor: inputDisabledColor,
            color: inputDisabledColor,
            bg: inputDisabledBg,
          }}
          isDisabled={isDisabled}
        />
        {rightAddon && (
          <InputRightAddon
            padding="1rem"
            height="40px"
            borderColor={error ? errorColor : isDisabled ? inputDisabledColor : borderColor}
            borderLeft={"none"}
            color={isDisabled ? inputDisabledColor : textColor}
            backgroundColor={isDisabled ? inputDisabledBg : rightAddonBg}
            borderRadius={0}
            fontFamily={"accent"}
            fontWeight={400}
            fontSize={"13px"}
          >
            {rightAddon}
          </InputRightAddon>
        )}
      </InputGroup>
      <FormLabel
        fontFamily={"accent"}
        pt={"4px"}
        fontSize={"11px"}
        color={errorColor}
        opacity={isDisabled ? 0.5 : 1}
      >
        {error}
      </FormLabel>
    </FormControl>
  );
};
