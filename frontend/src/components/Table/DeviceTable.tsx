import {
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
      <Table variant="simple" sx={{ borderCollapse: "collapse", width: "100%" }}>
        <Thead>
          <Tr backgroundColor={"th-bg"} h={"40px"}>
            <Th
              borderBottomColor={"border-color"}
              p={"8px 0 8px 12px"}
              borderRadius={0}
              color={"th-color"}
              textTransform={"uppercase"}
              fontSize={"xs"}
              maxW={"140px"}
              fontFamily={"accent"}
              fontWeight={400}
            >
              Hostname
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              textTransform={"uppercase"}
              fontSize={"xs"}
              textAlign={"center"}
              fontFamily={"accent"}
              fontWeight={400}
            >
              Date added
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              textTransform={"uppercase"}
              fontSize={"xs"}
              textAlign={"center"}
              fontFamily={"accent"}
              fontWeight={400}
            >
              IP
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              textTransform={"uppercase"}
              fontSize={"xs"}
              textAlign={"center"}
              fontFamily={"accent"}
              fontWeight={400}
            >
              Mac Address
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              textTransform={"uppercase"}
              fontSize={"xs"}
              textAlign={"center"}
              fontFamily={"accent"}
              fontWeight={400}
            >
              Miner
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              textTransform={"uppercase"}
              fontSize={"xs"}
              textAlign={"center"}
              fontFamily={"accent"}
              fontWeight={400}
            >
              ASIC
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              textTransform={"uppercase"}
              fontSize={"xs"}
              textAlign={"center"}
              fontFamily={"accent"}
              fontWeight={400}
            >
              Uptime
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              textTransform={"uppercase"}
              fontSize={"xs"}
              textAlign={"center"}
              fontFamily={"accent"}
              fontWeight={400}
            >
              FW v.
            </Th>
            <Th
              borderColor={"border-color"}
              p={0}
              borderRadius={0}
              color={"th-color"}
              textTransform={"uppercase"}
              fontSize={"xs"}
              textAlign={"center"}
              fontFamily={"accent"}
              fontWeight={400}
            >
              Status
            </Th>
            <Th borderColor={"border-color"} borderRadius={0}></Th>
          </Tr>
        </Thead>
        <Tbody>
          {devices.map((device) => (
            <Tr key={`registered-device-${device.mac}`} backgroundColor={"td-bg"}>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"13px"}
                textAlign={"left"}
                p={"12px"}
                maxW={"140px"}
                wordBreak={"normal"}
                whiteSpace={"break-spaces"}
                fontWeight="400"
                fontFamily={"accent"}
              >
                {device.info.hostname}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"13px"}
                textAlign={"center"}
                p={"12px"}
                fontWeight="400"
                fontFamily={"accent"}
              >
                {convertIsoTomMdDYy(device.createdAt!)}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"13px"}
                textAlign={"center"}
                p={"12px"}
                fontWeight="400"
                fontFamily={"accent"}
              >
                {device.ip}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"13px"}
                textAlign={"center"}
                p={"12px"}
                fontWeight="400"
                fontFamily={"accent"}
              >
                {device.mac}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"13px"}
                textAlign={"center"}
                p={"12px"}
                width={"125px"}
                maxWidth={"125px"}
                wordBreak={"normal"}
                whiteSpace={"break-spaces"}
                fontWeight="400"
                fontFamily={"accent"}
              >
                {getMinerName(device.info.boardVersion)}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"13px"}
                textAlign={"center"}
                p={"12px 8px"}
                fontWeight="400"
                fontFamily={"accent"}
              >
                {device.info.ASICModel}
              </Td>
              <Td
                borderTopWidth={"1px"}
                borderBottomWidth={0}
                borderColor={"border-color"}
                fontSize={"13px"}
                textAlign={"center"}
                p={"12px"}
                fontWeight="400"
                fontFamily={"accent"}
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
                fontSize={"13px"}
                textAlign={"center"}
                p={"12px"}
                fontWeight="400"
                fontFamily={"accent"}
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
                fontWeight="500"
              >
                <DeleteIcon
                  h={"20"}
                  w={"14px"}
                  color={"body-text"}
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
