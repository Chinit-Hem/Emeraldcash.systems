"use client";

import { VehicleFormUnified } from "@/lib/useVehicleFormUnified";
import type { Vehicle } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";

interface BasicVehicleForm
