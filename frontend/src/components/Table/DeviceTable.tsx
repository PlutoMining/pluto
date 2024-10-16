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
  Tr,
  useTheme,
} from "@chakra-ui/react";
import { Device } from "@pluto/interfaces";
import { DeviceStatusBadge } from "../Badge";
import { getMinerName } from "@/utils/minerMap";
import { DeleteIcon } from "../icons/DeleteIcon";

interface DeviceTableProps {
  devices: Device[];
  removeDeviceFunction: (deviceId: string) => void;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({ devices, removeDeviceFunction }) => {
  const theme = useTheme();

  const convertIsoTomMdDYy = (isoDate: string): string => {
    // Creare un oggetto Date dalla stringa ISO
    const date = new Date(isoDate);

    // Ottenere il giorno, il mese e l'anno
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // I mesi partono da 0
    const year = String(date.getFullYear()).slice(-2); // Ultimi due cifre dell'anno

    // Restituire la data formattata
    return `${month}/${day}/${year}`;
  };

  const formatTime = (seconds: number) => {
    const oneDayInSeconds = 86400;
    const oneHourInSeconds = 3600;
    const oneMinuteInSeconds = 60;

    if (seconds === 0) {
      return "-";
    } else if (seconds >= oneDayInSeconds) {
      const days = Math.floor(seconds / oneDayInSeconds);
      return `${days} ${days > 1 ? "days" : "day"}`;
    } else if (seconds >= oneHourInSeconds) {
      const hours = Math.floor(seconds / oneHourInSeconds);
      return `${hours} ${hours > 1 ? "hours" : "hour"}`;
    } else if (seconds >= oneMinuteInSeconds) {
      const minutes = Math.floor(seconds / oneMinuteInSeconds);
      return `${minutes} ${minutes > 1 ? "minutes" : "minute"}`;
    } else {
      return "< 1 minute"; // Se il tempo è inferiore a un minuto, mostra "meno di 1 minuto"
    }
  };

  return (
    <TableContainer display={{ base: "none", tablet: "block" }}>
      <Table variant="simple">
        <Thead>
          <Tr backgroundColor={theme.colors.greyscale[100]} h={"40px"}>
            <Th
              borderColor={theme.colors.greyscale[100]}
              // p={"6px 12px 6px 16px"}
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
              >
                Date added
              </Text>
            </Th>
            <Th borderColor={theme.colors.greyscale[100]}>
              <Text
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
                {formatTime(device.info.uptimeSeconds)}
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
