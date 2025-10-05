/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Radio as ChakraRadio, Text, useToken } from "@chakra-ui/react";
import React from "react";

interface RadioButtonProps {
  id: string;
  value: string;
  label: string;
  disabled?: boolean;
}

export const RadioButton: React.FC<RadioButtonProps> = ({ label, value, id, disabled }) => {
  const [borderColor] = useToken("colors", ["radio-button-border-color"]);
  const [accentColor] = useToken("colors", ["input-accent-color"]);
  const [bgColor] = useToken("colors", ["bg-color"]);
  const [colorDisabled] = useToken("colors", ["radio-button-border-disabled"]);
  const [borderColorDisabled] = useToken("colors", ["radio-button-color-disabled"]);

  return (
    <ChakraRadio
      value={value}
      id={id}
      borderColor={borderColor}
      _checked={{
        bg: accentColor,
        borderColor: borderColor,
      }}
      isDisabled={disabled}
      _disabled={{
        bg: colorDisabled,
        borderColor: borderColorDisabled,
      }}
      fontFamily={"accent"}
      color={"body-text"}
      boxShadow={`inset 0 0 0 1px ${bgColor}`}
    >
      <Text
        fontSize="sm"
        fontWeight={500}
        color={"body-text"}
        flexGrow={1}
        mr="0.5rem"
        fontFamily={"accent"}
      >
        {label}
      </Text>
    </ChakraRadio>
  );
};
