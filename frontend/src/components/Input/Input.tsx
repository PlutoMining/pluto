import { ChangeEventHandler } from "react";
import {
  FormControl,
  FormLabel,
  Input as ChakraInput,
  useTheme,
  FormErrorMessage,
  InputRightAddon,
  InputLeftAddon,
  InputGroup,
} from "@chakra-ui/react";
import React from "react";

interface InputProps {
  label?: string;
  name: string;
  id: string;
  type?: "text" | "number" | "password";
  placeholder: string;
  defaultValue?: string | number;
  value?: string | number;
  pattern?: string;
  error?: string;
  isInvalid?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
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
  const theme = useTheme();

  return (
    <FormControl>
      {label && (
        <FormLabel htmlFor={name} fontWeight={400} fontSize={"13px"} margin={"4px 0"}>
          {label}
        </FormLabel>
      )}
      <InputGroup>
        {leftAddon && <InputLeftAddon>{leftAddon}</InputLeftAddon>}
        <ChakraInput
          id={id}
          name={name}
          placeholder={placeholder}
          defaultValue={defaultValue}
          onChange={onChange}
          type={type}
          outline={"none"}
          backgroundColor={theme.colors.greyscale[0]}
          borderWidth={"1px"}
          borderColor={theme.colors.greyscale[500]}
          color={theme.colors.greyscale[900]}
          borderRadius={"6px"}
          padding={"1rem"}
          height={"32px"}
          boxShadow={"none"}
          pattern={pattern}
          _placeholder={{
            color: theme.colors.greyscale[500],
            opacity: 0.5,
          }}
          _hover={{
            borderColor: theme.colors.greyscale[500],
            borderWidth: "1px",
          }}
          _focus={{
            outline: "none",
            boxShadow: "none",
            borderColor: theme.colors.brand.secondary,
            borderWidth: "1px",
          }}
          isInvalid={!!error}
          _invalid={{
            borderColor: theme.colors.alert.error,
            borderWidth: "1px",
          }}
          isDisabled={isDisabled}
        />
        {rightAddon && (
          <InputRightAddon
            padding="1rem"
            height="2rem"
            borderColor={theme.colors.greyscale[500]}
            borderLeft={"none"}
            backgroundColor={theme.colors.greyscale[100]}
            opacity={isDisabled ? 0.5 : 1}
          >
            {rightAddon}
          </InputRightAddon>
        )}
      </InputGroup>
      <FormLabel pt={"4px"} fontSize={"11px"} color={theme.colors.alert.error}>
        {error}
      </FormLabel>
    </FormControl>
  );
};
