import { ChangeEventHandler } from "react";
import {
  FormControl,
  FormLabel,
  Input as ChakraInput,
  useTheme,
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
  const [errorColor] = useToken("colors", ["input-right-bg"]);

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
          backgroundColor={bgColor}
          borderWidth={"1px"}
          borderColor={borderColor}
          color={textColor}
          borderRadius={0}
          padding={"1rem"}
          height={"32px"}
          boxShadow={"none"}
          pattern={pattern}
          _placeholder={{
            color: textColor,
            opacity: 0.5,
          }}
          _hover={{
            borderColor: textColor,
            borderWidth: "1px",
          }}
          _focus={{
            outline: "none",
            boxShadow: "none",
            borderColor: textColor,
            borderWidth: "1px",
          }}
          isInvalid={!!error}
          _invalid={{
            borderColor: textColor,
            borderWidth: "1px",
          }}
          isDisabled={isDisabled}
        />
        {rightAddon && (
          <InputRightAddon
            padding="1rem"
            height="2rem"
            borderColor={error ? errorColor : borderColor}
            borderLeft={"none"}
            backgroundColor={rightAddonBg}
            opacity={isDisabled ? 0.5 : 1}
            borderRadius={0}
          >
            {rightAddon}
          </InputRightAddon>
        )}
      </InputGroup>
      <FormLabel pt={"4px"} fontSize={"11px"} color={errorColor} opacity={isDisabled ? 0.5 : 1}>
        {error}
      </FormLabel>
    </FormControl>
  );
};
