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
      <Table
        variant="simple"
        // layout="fixed"
      >
        <Thead>
          <Tr backgroundColor={"th-bg"} h={"40px"}>
            <Th
              borderColor={"border-color"}
              p={"8px 0 8px 12px"}
              borderRadius={0}
              color={"th-color"}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"xs"}
              maxW={"140px"}
              fontWeight={500}
            >
              Hostname
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"xs"}
              textAlign={"center"}
              fontWeight={500}
            >
              Date added
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"xs"}
              textAlign={"center"}
              fontWeight={500}
            >
              IP
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"xs"}
              textAlign={"center"}
              fontWeight={500}
            >
              Mac Address
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"xs"}
              textAlign={"center"}
              fontWeight={500}
            >
              Miner
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"xs"}
              textAlign={"center"}
              fontWeight={500}
            >
              ASIC
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"xs"}
              textAlign={"center"}
              fontWeight={500}
            >
              Uptime
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"xs"}
              textAlign={"center"}
              fontWeight={500}
            >
              FW v.
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"xs"}
              textAlign={"center"}
              fontWeight={500}
            >
              Status
            </Th>
            <Th borderColor={"border-color"} borderRadius={0}></Th>
          </Tr>
        </Thead>
        <Tbody>
          {devices.map((device) => (
            <Tr key={`registered-device-${device.mac}`}>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"14px"}
                textAlign={"left"}
                p={"12px"}
                maxW={"140px"}
                wordBreak={"normal"}
                whiteSpace={"break-spaces"}
              >
                {device.info.hostname}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px"}
              >
                {convertIsoTomMdDYy(device.createdAt!)}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px"}
              >
                {device.ip}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px"}
              >
                {device.mac}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px"}
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
                borderColor={"border-color"}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px 8px"}
              >
                {device.info.ASICModel}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px"}
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
                borderColor={"border-color"}
                fontSize={"14px"}
                textAlign={"center"}
                p={"12px"}
              >
                {device.info.version}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                textAlign={"center"}
                p={"12px"}
              >
                <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                p={"12px"}
                maxWidth={{ tablet: "14px", desktop: "unset" }}
                width={{ tablet: "14px", desktop: "unset" }}
              >
                <DeleteIcon
                  h={"20"}
                  w={"14px"}
                  color={"#000"}
                  onClick={() => removeDeviceFunction(device.mac)}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
};
