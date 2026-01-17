"use client";
/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { DeviceAccordion } from "@/components/Accordion/DeviceAccordion";
import Alert from "@/components/Alert/Alert";
import { AlertInterface, AlertStatus } from "@/components/Alert/interfaces";
import Button from "@/components/Button/Button";
import { BasicModal } from "@/components/Modal/BasicModal";
import { RegisterDevicesModal } from "@/components/Modal/RegisterDevicesModal";
import { CircularProgressWithDots } from "@/components/ProgressBar/CircularProgressWithDots";
import { DeviceTable } from "@/components/Table/DeviceTable";
import { AddIcon } from "@/components/icons/AddIcon";
import { useSocket } from "@/providers/SocketProvider";
import { useDisclosure } from "@/hooks/useDisclosure";
import { Device } from "@pluto/interfaces";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";

export default function DevicesClient() {
  const [registeredDevices, setRegisteredDevices] = useState<Device[] | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isConfirmationModalOpen,
    onOpen: onConfirmationModalOpen,
    onClose: onConfirmationModalClose,
  } = useDisclosure();

  const [deviceIdToRemove, setDeviceIdToRemove] = useState<string | null>(null);

  const [alert, setAlert] = useState<AlertInterface>();
  const {
    isOpen: isOpenAlert,
    onOpen: onOpenAlert,
    onClose: onCloseAlert,
  } = useDisclosure({ defaultIsOpen: false });

  useEffect(() => {
    fetchRegisteredDevices();
  }, []);

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    const listener = (e: Device) => {
      setRegisteredDevices((prevDevices) => {
        if (!prevDevices) return prevDevices;

        const deviceIndex = prevDevices.findIndex((device) => device.mac === e.mac);

        if (deviceIndex === -1) {
          return prevDevices;
        }

        const updatedDevices = [...prevDevices];
        updatedDevices[deviceIndex] = {
          ...updatedDevices[deviceIndex],
          ...e,
        };

        return updatedDevices;
      });
    };

    if (isConnected) {
      socket.on("stat_update", listener);
      socket.on("error", listener);

      return () => {
        socket.off("stat_update", listener);
        socket.off("error", listener);
      };
    }
  }, [isConnected, socket, registeredDevices]);

  const fetchRegisteredDevices = async () => {
    try {
      const response = await axios.get("/api/devices/imprint");
      const imprintedDevices: Device[] = response.data.data;
      setRegisteredDevices([...imprintedDevices]);
      return imprintedDevices;
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
  };

  const putListenDevices = async (imprintedDevices?: Device[]) => {
    try {
      await axios.put("/api/devices/listen", {
        macs: imprintedDevices?.map((d) => d.mac),
      });
    } catch (error) {
      console.error("Error updating devices to listen:", error);
    }
  };

  const removeRegisteredDevice = useCallback((deviceId: string) => {
    setDeviceIdToRemove(deviceId);
    onConfirmationModalOpen();
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deviceIdToRemove) {
      try {
        const imprintedDevices = await fetchRegisteredDevices();

        const updatedDevices = imprintedDevices?.filter((device) => device.mac !== deviceIdToRemove);

        await putListenDevices(updatedDevices);

        await axios.delete(`/api/devices/imprint/${deviceIdToRemove}`);

        setAlert({
          status: AlertStatus.SUCCESS,
          title: "Save Successful",
          message: `Device ${imprintedDevices!.filter((d) => d.mac === deviceIdToRemove)[0].mac} has been correctly removed.`,
        });

        setRegisteredDevices(imprintedDevices!.filter((d) => d.mac !== deviceIdToRemove));

        onOpenAlert();

        onConfirmationModalClose();
      } catch (error) {
        console.error("Error deleting device:", error);
        setAlert({
          status: AlertStatus.ERROR,
          title: "Remove failed.",
          message: `${error} Please try again.`,
        });
        onOpenAlert();
      }
    }
  }, [deviceIdToRemove, registeredDevices]);

  const handleDevicesChanged = async () => {
    const imprintedDevices = await fetchRegisteredDevices();
    await putListenDevices(imprintedDevices);
  };

  const closeAlert = useCallback(() => {
    setAlert(undefined);
    onCloseAlert();
  }, [onCloseAlert]);

  return (
    <div className="container flex-1 py-6">
      {alert ? (
        <Alert isOpen={isOpenAlert} onOpen={onOpenAlert} onClose={closeAlert} content={alert} />
      ) : null}

      <form className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-6">
          <h1 className="font-heading text-4xl font-bold uppercase">Your devices</h1>
          <Button
            variant={"primary"}
            onClick={onOpen}
            rightIcon={<AddIcon color="currentColor" />}
            label="Add device"
          />
        </div>

        {registeredDevices ? (
          registeredDevices.length > 0 ? (
            <div className="border border-border bg-card text-card-foreground">
              <DeviceTable devices={registeredDevices} removeDeviceFunction={removeRegisteredDevice} />
              <div className="tablet:hidden border-t border-border">
                <DeviceAccordion removeFunction={removeRegisteredDevice} devices={registeredDevices} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="text-sm text-muted-foreground">Looks like you haven&lsquo;t added any devices yet!</p>
              <p className="text-sm text-muted-foreground">
                To get started with monitoring, please add your first device.
              </p>
              <Button variant={"primary"} onClick={onOpen} label="Add a new device" />
            </div>
          )
        ) : (
          <div className="mx-auto my-8 flex w-full flex-col items-center">
            <CircularProgressWithDots />
          </div>
        )}

        <RegisterDevicesModal isOpen={isOpen} onClose={onClose} onDevicesChanged={handleDevicesChanged} />

        <BasicModal
          isOpen={isConfirmationModalOpen}
          onClose={onConfirmationModalClose}
          title={"Device removal"}
          body={"Are you sure you want to remove this device?"}
          primaryActionLabel={"Proceed"}
          primaryAction={handleConfirmDelete}
          secondaryActionLabel={"Cancel"}
          secondaryAction={onConfirmationModalClose}
        />
      </form>
    </div>
  );
}
