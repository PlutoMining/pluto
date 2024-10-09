import {
  AlertDescription,
  AlertTitle,
  Box,
  Alert as ChakraAlert,
  Flex,
  useTheme,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { CloseIcon } from "../icons/CloseIcon";
import { ErrorIcon } from "../icons/ErrorIcon";
import { SuccessIcon } from "../icons/SuccessIcon";
import { WarningIcon } from "../icons/WarningIcon";
import { AlertProps, AlertStatus } from "./interfaces";

const Alert: React.FC<AlertProps> = (alertProps: AlertProps) => {
  const { isOpen, onOpen, onClose, content } = alertProps;

  const [icon, setIcon] = useState<React.JSX.Element>();
  const [color, setColor] = useState<string>();

  const theme = useTheme();

  useEffect(() => {
    switch (content.status) {
      case AlertStatus.ERROR: {
        setIcon(<ErrorIcon color={theme.colors.alert.error} h={"18"} />);
        setColor(theme.colors.alert.error);
        break;
      }
      case AlertStatus.SUCCESS: {
        setIcon(<SuccessIcon color={theme.colors.alert.success} h={"18"} />);
        setColor(theme.colors.alert.success);
        break;
      }
      case AlertStatus.WARNING: {
        setIcon(<WarningIcon color={theme.colors.alert.warning} h={"18"} />);
        setColor(theme.colors.alert.warning);
        break;
      }
      default:
        break;
    }
  }, [content.status]);

  return (
    <Box
      pos={"absolute"}
      top={"4rem"}
      left={0}
      right={0}
      zIndex={10}
      maxWidth={theme.breakpoints["desktop"]}
      margin={"0 auto"}
      p={"1rem 3rem"}
    >
      <Box
        bg={theme.colors.greyscale[0]}
        borderRadius={"1rem"}
        borderColor={color}
        borderWidth={"2px"}
        p={"0.5rem"}
      >
        <ChakraAlert
          borderRadius={"1rem"}
          bg={theme.colors.greyscale[0]}
          display={"flex"}
          flexDir={"column"}
          alignItems={"start"}
          gap={"0.5rem"}
          p={0}
        >
          <Box pos={"absolute"} top={"0.25rem"} right={"0.25rem"} cursor={"pointer"}>
            <CloseIcon h={"18"} color={theme.colors.greyscale[500]} onClick={onClose} />
          </Box>
          <Flex alignItems={"center"} gap={"0.5rem"}>
            {icon}
            <AlertTitle
              color={theme.colors.greyscale[900]}
              fontFamily={"heading"}
              fontSize={"1rem"}
              fontWeight={500}
            >
              {content.title}
            </AlertTitle>
          </Flex>
          <AlertDescription
            color={theme.colors.greyscale[900]}
            fontWeight={400}
            fontSize={"13px"}
            paddingLeft={"2rem"}
          >
            {content.message}
          </AlertDescription>
        </ChakraAlert>
      </Box>
    </Box>
  );
};

export default Alert;
