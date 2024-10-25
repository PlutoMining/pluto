import {
  Box,
  Link,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useTheme,
} from "@chakra-ui/react";
import { Device } from "@pluto/interfaces";
import { DeviceStatusBadge } from "../Badge";
import { getMinerName } from "@/utils/minerMap";
import { DeleteIcon } from "../icons/DeleteIcon";
import { convertIsoTomMdDYy, formatDetailedTime, formatTime } from "@/utils/formatTime";

interface DeviceTableProps {
  devices: Device[];
  removeDeviceFunction: (deviceId: string) => void;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({ devices, removeDeviceFunction }) => {
  const theme = useTheme();

  return (
    <TableContainer display={{ base: "none", tablet: "block" }}>
      <Table variant="simple">
        <Thead>
          <Tr backgroundColor={theme.colors.greyscale[100]} h={"40px"}>
            <Th
              borderColor={theme.colors.greyscale[100]}
              p={"8px 0 8px 12px"}
              borderRadius={"7px 0 0 0"}
              color={theme.colors.greyscale[500]}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"12px"}
            >
              Hostname
            </Th>
            <Th borderColor={theme.colors.greyscale[100]}>
              <Text
                fontWeight={500}
                color={theme.colors.greyscale[500]}
                fontFamily={"heading"}
                textTransform={"capitalize"}
                fontSize={"12px"}
                textAlign={"center"}
                p={0}
              >
                Date added
              </Text>
            </Th>
            <Th borderColor={theme.colors.greyscale[100]}>
              <Text
                p={0}
                fontWeight={500}
                color={theme.colors.greyscale[500]}
                fontFamily={"heading"}
                textTransform={"capitalize"}
                fontSize={"12px"}
                textAlign={"center"}
              >
                IP
              </Text>
            </Th>
            <Th borderColor={theme.colors.greyscale[100]}>
              <Text
                p={0}
                fontWeight={500}
                color={theme.colors.greyscale[500]}
                fontFamily={"heading"}
                textTransform={"capitalize"}
                fontSize={"12px"}
                textAlign={"center"}
              >
                Mac Address
              </Text>
            </Th>
            <Th borderColor={theme.colors.greyscale[100]}>
              <Text
                p={0}
                fontWeight={500}
                color={theme.colors.greyscale[500]}
                fontFamily={"heading"}
                textTransform={"capitalize"}
                fontSize={"12px"}
                textAlign={"center"}
              >
                Miner
              </Text>
            </Th>
            <Th borderColor={theme.colors.greyscale[100]}>
              <Text
                p={0}
                fontWeight={500}
                color={theme.colors.greyscale[500]}
                fontFamily={"heading"}
                textTransform={"capitalize"}
                fontSize={"12px"}
                textAlign={"center"}
              >
                ASIC
              </Text>
            </Th>
            <Th borderColor={theme.colors.greyscale[100]}>
              <Text
                p={0}
                fontWeight={500}
                color={theme.colors.greyscale[500]}
                fontFamily={"heading"}
                textTransform={"capitalize"}
                fontSize={"12px"}
                textAlign={"center"}
              >
                Uptime
              </Text>
            </Th>
            <Th borderColor={theme.colors.greyscale[100]}>
              <Text
                p={0}
                fontWeight={500}
                color={theme.colors.greyscale[500]}
                fontFamily={"heading"}
                textTransform={"capitalize"}
                fontSize={"12px"}
                textAlign={"center"}
              >
                FW v.
              </Text>
            </Th>
            <Th borderColor={theme.colors.greyscale[100]}>
              <Text
                p={0}
                fontWeight={500}
                color={theme.colors.greyscale[500]}
                fontFamily={"heading"}
                textTransform={"capitalize"}
                fontSize={"12px"}
                textAlign={"center"}
              >
                Status
              </Text>
            </Th>
            <Th borderColor={theme.colors.greyscale[100]} borderRadius={"0 7px 0 0"}></Th>
          </Tr>
        </Thead>
        <Tbody>
          {devices.map((device) => (
            <Tr key={`registered-device-${device.mac}`}>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={theme.colors.greyscale[100]}
                fontSize={"14px"}
                textAlign={"left"}
                p={"12px 16px"}
                // width={{ tablet: "200px", desktop: "unset" }}
                maxWidth={{ tablet: "200px", desktop: "unset" }}
                wordBreak={"normal"}
                whiteSpace={"break-spaces"}
              >
                {device.info.hostname}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={theme.colors.greyscale[100]}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px 8px"}
              >
                {convertIsoTomMdDYy(device.createdAt!)}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={theme.colors.greyscale[100]}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px 8px"}
              >
                {device.ip}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={theme.colors.greyscale[100]}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px 8px"}
              >
                {device.mac}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={theme.colors.greyscale[100]}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px 8px"}
                width={"125px"}
                maxWidth={"125px"}
                wordBreak={"normal"}
                whiteSpace={"break-spaces"}
              >
                {getMinerName(device.info.boardVersion)}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={theme.colors.greyscale[100]}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px 8px"}
              >
                {device.info.ASICModel}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={theme.colors.greyscale[100]}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px 8px"}
              >
                <Tooltip
                  label={formatDetailedTime(device.info.uptimeSeconds)}
                  aria-label={formatDetailedTime(device.info.uptimeSeconds)}
                >
                  {formatTime(device.info.uptimeSeconds)}
                </Tooltip>
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={theme.colors.greyscale[100]}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px 8px"}
              >
                {device.info.version}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={theme.colors.greyscale[100]}
                textAlign={"center"}
                p={"12px 8px"}
              >
                <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={theme.colors.greyscale[100]}
                p={"12px 8px"}
                maxWidth={{ tablet: "14px", desktop: "unset" }}
                width={{ tablet: "14px", desktop: "unset" }}
              >
                <Box display={{ tablet: "block", desktop: "none" }}>
                  <DeleteIcon
                    h={"20"}
                    w={"14px"}
                    color={"#000"}
                    onClick={() => removeDeviceFunction(device.mac)}
                  />
                </Box>
                <Link
                  display={{ tablet: "none", desktop: "block" }}
                  onClick={() => removeDeviceFunction(device.mac)}
                  textDecoration={"underline"}
                  fontSize={"14px"}
                  fontWeight={500}
                >
                  Remove
                </Link>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
};
