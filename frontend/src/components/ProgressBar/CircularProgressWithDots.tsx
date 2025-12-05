/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import React from "react";
import { keyframes } from "@emotion/react";
import { Flex, Box, usePrefersReducedMotion, useToken } from "@chakra-ui/react";

export const CircularProgressWithDots = () => {
  const [accentColor] = useToken("colors", ["accent-color"]);

  const styles = {
    dot1: {
      position: "relative",
      width: "1rem",
      height: "1rem",
      // borderRadius: "50px",
      backgroundColor: accentColor,
      color: accentColor,
      display: "inline-block",
      margin: "0 2px",
    },
    dot2: {
      width: "1rem",
      height: "1rem",
      // borderRadius: "50px",
      backgroundColor: accentColor,
      color: accentColor,
      display: "inline-block",
      margin: "0 2px",
    },

    dot3: {
      width: "1rem",
      height: "1rem",
      // borderRadius: "50px",
      backgroundColor: accentColor,
      display: "inline-block",
      margin: "0 2px",
    },
  };

  const prefersReducedMotion = usePrefersReducedMotion();
  const animation1 = prefersReducedMotion ? undefined : `${keyframe_dot1} infinite 1s linear`;
  const animation2 = prefersReducedMotion ? undefined : `${keyframe_dot2} infinite 1s linear`;
  const animation3 = prefersReducedMotion ? undefined : `${keyframe_dot3} infinite 1s linear`;
  return (
    <Flex gap={"1rem"}>
      <Box style={styles.dot2} animation={animation1} />
      <Box style={styles.dot2} animation={animation2} />
      <Box style={styles.dot3} animation={animation3} />
    </Flex>
  );
};

const keyframe_dot1 = keyframes`
  0% {
    opacity: 0.25;
  }
  25% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  75% {
    opacity: 0.25;
  }
  100% {
    opacity: 0.25;
  }
`;
const keyframe_dot2 = keyframes`
 0% {
    opacity: 0.25;
  }
  25% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
  75% {
    opacity: 0.25;
  }
  100% {
    opacity: 0.25;
  }
`;
const keyframe_dot3 = keyframes`
 0% {
    opacity: 0.25;
  }
  25% {
    opacity: 0.25;
  }
  50% {
    opacity: 0.5;
  }
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0.25;
  }
`;
