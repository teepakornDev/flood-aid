import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiNotFoundResponse, ApiOkResponse, ApiResponse, ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { CreateSosDto, SosIntakeDto, SosPrivateStatusDto, SosReceiptDto } from "./sos.dto";
import { SosIntakeGuard, sosIntakeKey } from "./sos-intake.guard";
import { SosService } from "./sos.service";

@ApiTags("Private SOS")
@Controller("sos")
export class SosController {
  constructor(private readonly sos: SosService) {}

  @Get("intake")
  @ApiOkResponse({ type: SosIntakeDto })
  intake(@Req() request: Request): SosIntakeDto {
    return { enabled: Boolean(sosIntakeKey(request)) };
  }

  @Post()
  @UseGuards(SosIntakeGuard)
  @ApiHeader({ name: "Idempotency-Key", required: true, description: "Secret 32 random bytes encoded as base64url." })
  @ApiCreatedResponse({ type: SosReceiptDto, description: "Committed SOS receipt" })
  @ApiOkResponse({ type: SosReceiptDto, description: "Replay of a committed SOS receipt" })
  @ApiBadRequestResponse({ description: "Invalid credential or submission fields" })
  @ApiResponse({ status: 409, description: "The key is attached to a different request" })
  @ApiResponse({ status: 410, description: "The existing receipt recovery interval expired" })
  @ApiResponse({ status: 429, description: "Simulation submission limit exceeded" })
  @ApiResponse({ status: 503, description: "Intake disabled or temporarily unavailable" })
  async create(
    @Body() body: CreateSosDto, @Headers("idempotency-key") key: string | undefined, @Res() response: Response,
  ): Promise<void> {
    const { receipt, replayed } = await this.sos.submit(body, key);
    response.status(replayed ? 200 : 201).json(receipt);
  }

  @Get(":id")
  @ApiBearerAuth("sosTracking")
  @ApiOkResponse({ type: SosPrivateStatusDto })
  @ApiNotFoundResponse({ description: "Case unavailable to this tracking credential" })
  status(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Headers("authorization") token: string | undefined,
  ): Promise<SosPrivateStatusDto> {
    return this.sos.status(id, token);
  }
}
