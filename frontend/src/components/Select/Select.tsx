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
  optionValues: Array<{ label: string; value: string | number }>;
  onChange: ChangeEventHandler<HTMLSelectElement>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  name,
  id,
  value,
  defaultValue,
  optionValues = [],
  onChange,
}) => {
  const [borderColor] = useToken("colors", ["border-color"]);
  const [bgColor] = useToken("colors", ["input-bg"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [inputLabelColor] = useToken("colors", ["input-label-color"]);

  // primaryColor
  const [primaryColor] = useToken("colors", ["cta-bg"]);
  const [primaryColorHover] = useToken("colors", ["cta-bg-hover"]);

  return (
    <FormControl>
      <FormLabel
        htmlFor={name}
        fontWeight={600}
        fontSize={"xs"}
        fontFamily={"body"}
        textTransform={"uppercase"}
        color={inputLabelColor}
      >
        {label}
      </FormLabel>
      <ChakraSelect
        fontFamily={"accent"}
        fontWeight={400}
        fontSize={"13px"}
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
        iconColor={primaryColor}
        borderRadius={0}
        height={"40px"}
        boxShadow={"none"}
        _focus={{
          outline: "none",
          boxShadow: "none",
          border: `1px solid ${primaryColor}`,
          iconColor: primaryColor,
        }}
        _hover={{
          border: `1px solid ${primaryColorHover}`,
          iconColor: primaryColorHover,
        }}
      >
        {optionValues &&
          Array.isArray(optionValues) &&
          optionValues.map((elem, index) => (
            <option key={`option-${index}-${elem.value}`} value={elem.value}>
              {elem.label}
            </option>
          ))}
      </ChakraSelect>
    </FormControl>
  );
};
