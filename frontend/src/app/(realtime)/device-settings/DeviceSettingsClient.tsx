"use client";
/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { DeviceSettingsAccordion } from "@/components/Accordion";
import Alert from "@/components/Alert/Alert";
import { AlertInterface, AlertStatus } from "@/components/Alert/interfaces";
import Button from "@/components/Button/Button";
import { RestartAllIcon } from "@/components/icons/RestartIcon";
import { SearchInput } from "@/components/Input";
import { CircularProgressWithDots } from "@/components/ProgressBar/CircularProgressWithDots";
import { Modal } from "@/components/ui/modal";
import { useDisclosure } from "@/hooks/useDisclosure";
import { Device } from "@pluto/interfaces";
import axios from "axios";
import NextLink from "next/link";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

export default function DeviceSettingsClient() {
  const { isOpen: isOpenModal, onOpen: onOpenModal, onClose: onCloseModal } = useDisclosure();
  const {
    isOpen: isOpenAlert,
    onOpen: onOpenAlert,
    onClose: onCloseAlert,
  } = useDisclosure({ defaultIsOpen: false });

  const [alert, setAlert] = useState<AlertInterface>();
  const [imprintedDevices, setImprintedDevices] = useState<Device[] | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const hasSearchedRef = useRef(false);

  const fetchImprintedDevices = useCallback(async () => {
    try {
      const response = await axios.get<{ data: Device[] }>("/api/devices/imprint");
      const devices = response.data.data;

      setImprintedDevices(devices);
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
  }, []);

  useEffect(() => {
    void fetchImprintedDevices();
  }, [fetchImprintedDevices]);

  const handleRestartAll = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();

      onCloseModal();

      const handleRestart = (mac: string) => axios.post(`/api/devices/${mac}/system/restart`);

      try {
        if (imprintedDevices && imprintedDevices.length > 0) {
          await Promise.all(imprintedDevices.map((d) => handleRestart(d.mac)));

          setAlert({
            status: AlertStatus.SUCCESS,
            title: "Restart Successful",
            message:
              "All devices have been restarted successfully. The eventual new settings have been applied, and the miners are back online.",
          });

          onOpenAlert();
        } else {
          setAlert({
            status: AlertStatus.WARNING,
            title: "No Devices Available",
            message: "There are no registered devices to restart at this moment.",
          });
          onOpenAlert();
        }
      } catch (error) {
        let errorMessage = "An error occurred while attempting to restart the devices.";

        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        }

        setAlert({
          status: AlertStatus.ERROR,
          title: "Restart Failed",
          message: `${errorMessage} Please try again or contact support if the issue persists.`,
        });
        onOpenAlert();
      }
    },
    [imprintedDevices, onCloseModal, onOpenAlert]
  );

  const handleSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query === "") {
      if (hasSearchedRef.current) {
        void fetchImprintedDevices();
        hasSearchedRef.current = false;
      }
      return;
    }

    hasSearchedRef.current = true;

    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      try {
        const response = await axios.get<{ data: Device[] }>("/api/devices/imprint", {
          params: { q: query },
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setImprintedDevices(response.data.data || []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Error searching devices:", error);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [fetchImprintedDevices, searchQuery]);

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
        <div className="flex flex-col gap-4 border-b border-border pb-4 tablet:flex-row tablet:items-center tablet:justify-between">
          <h1 className="font-heading text-4xl font-bold uppercase">Device settings</h1>
          <div className="flex w-full flex-col gap-4 tablet:w-auto tablet:flex-row tablet:items-center">
            <SearchInput label="Search device" onChange={handleSearch} placeholder="Search device" />
            <Button
              variant="primary"
              icon={<RestartAllIcon color="currentColor" />}
              onClick={onOpenModal}
              label="Restart all"
              disabled={!imprintedDevices || imprintedDevices.length === 0}
            />
          </div>
        </div>

        {imprintedDevices ? (
          imprintedDevices.length > 0 ? (
            <DeviceSettingsAccordion
              fetchedDevices={imprintedDevices}
              setAlert={setAlert}
              alert={alert}
              onOpenAlert={onOpenAlert}
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              To start using Pluto, go to{" "}
              <NextLink href={"/devices"} className="underline">
                Your Devices
              </NextLink>{" "}
              and add one or more devices.
            </p>
          )
        ) : (
          <div className="mx-auto my-8 flex w-full flex-col items-center">
            <CircularProgressWithDots />
          </div>
        )}
      </form>

      <Modal open={isOpenModal} onClose={onCloseModal}>
        <div className="w-full max-w-xl border border-border bg-card p-4 text-card-foreground">
          <div className="flex items-start justify-between gap-6">
            <h2 className="font-heading text-lg font-medium">Restart all devices?</h2>
            <button
              type="button"
              onClick={onCloseModal}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Keep in mind that restarting the device may result in the loss of an entire block of
            transactions.
          </p>
          <div className="mt-6 flex items-center justify-end gap-4">
            <Button variant="outlined" onClick={onCloseModal} label="Cancel" />
            <Button type="submit" variant="primary" onClick={handleRestartAll} label="Restart" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
