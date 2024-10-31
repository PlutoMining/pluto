import { ChangeEventHandler } from "react";
import { FormControl, FormLabel, Select as ChakraSelect, useToken } from "@chakra-ui/react";
import React from "react";
import { text } from "d3";

interface SelectProps {
  label: string;
  name: string;
  id: string;
  value?: string | number;
  defaultValue?: string | number;
  optionValues: Array<{ value: string | number; label: string }>;
  onChange: ChangeEventHandler<HTMLSelectElement>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  name,
  id,
  value,
  defaultValue,
  optionValues,
  onChange,
}) => {
  const [borderColor] = useToken("colors", ["border-color"]);
  const [bgColor] = useToken("colors", ["input-bg"]);
  const [textColor] = useToken("colors", ["body-text"]);

  return (
    <FormControl>
      <FormLabel
        htmlFor={name}
        fontWeight={400}
        fontSize={"13px"}
        fontFamily={"accent"}
        textTransform={"uppercase"}
      >
        {label}
      </FormLabel>
      <ChakraSelect
        id={id}
        name={name}
        onChange={onChange}
        value={value}
        defaultValue={defaultValue}
        outline={"none"}
        backgroundColor={bgColor}
        borderWidth={"1px"}
        borderColor={borderColor}
        color={textColor}
        borderRadius={0}
        height={"32px"}
        boxShadow={"none"}
        _focus={{
          outline: "none",
          boxShadow: "none",
          border: `2px solid ${textColor}`,
        }}
        _hover={{
          border: `2px solid ${textColor}`,
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
