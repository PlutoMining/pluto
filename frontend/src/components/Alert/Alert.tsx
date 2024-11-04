import {
  AlertDescription,
  AlertTitle,
  Box,
  Alert as ChakraAlert,
  Flex,
  useTheme,
  useToken,
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

  const [successColor, warningColor, errorColor] = useToken("colors", [
    "success-color",
    "warning-color",
    "error-color",
  ]);

  const [bodyText] = useToken("colors", ["body-text"]);

  useEffect(() => {
    switch (content.status) {
      case AlertStatus.ERROR: {
        setIcon(<ErrorIcon color={errorColor} h={"18"} />);
        setColor(errorColor);
        break;
      }
      case AlertStatus.SUCCESS: {
        setIcon(<SuccessIcon color={successColor} h={"18"} />);
        setColor(successColor);
        break;
      }
      case AlertStatus.WARNING: {
        setIcon(<WarningIcon color={warningColor} h={"18"} />);
        setColor(warningColor);
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
      p={{ base: "1rem", tablet: "1rem 2.5rem" }}
    >
      <Box bg={"bg-color"} borderRadius={0} borderColor={color} borderWidth={"1.5px"} p={"0.5rem"}>
        <ChakraAlert
          borderRadius={"1rem"}
          bg={"bg-color"}
          display={"flex"}
          flexDir={"column"}
          alignItems={"start"}
          gap={"0.5rem"}
          p={0}
        >
          <Box pos={"absolute"} top={"0.25rem"} right={"0.25rem"} cursor={"pointer"}>
            <CloseIcon h={"18"} color={bodyText} onClick={onClose} />
          </Box>
          <Flex alignItems={"center"} gap={"0.5rem"}>
            {icon}
            <AlertTitle color={color} fontFamily={"heading"} fontSize={"1rem"} fontWeight={500}>
              {content.title}
            </AlertTitle>
          </Flex>
          <AlertDescription
            color={"body-text"}
            fontWeight={300}
            fontSize={"13px"}
            paddingLeft={"2rem"}
            fontFamily={"accent"}
          >
            {content.message}
          </AlertDescription>
        </ChakraAlert>
      </Box>
    </Box>
  );
};

export default Alert;
