package api

import (
	"context"

	"github.com/roger/protoai_mcp/internal/registry"
	registrypb "github.com/roger/protoai_mcp/gen/proto/protoai/registry/v1"
)

// RegistryHandler implements the ProtoAi Registry gRPC service
type RegistryHandler struct {
	registrypb.UnimplementedProtoAiRegistryServer
	service *registry.RegistryService
}

// NewRegistryHandler creates a new instance of RegistryHandler
func NewRegistryHandler(service *registry.RegistryService) *RegistryHandler {
	return &RegistryHandler{
		service: service,
	}
}

// RegisterService implements the RegisterService RPC method
func (h *RegistryHandler) RegisterService(ctx context.Context, req *registrypb.RegisterServiceRequest) (*registrypb.RegisterServiceResponse, error) {
	return h.service.RegisterService(req)
}

// UnregisterService implements the UnregisterService RPC method
func (h *RegistryHandler) UnregisterService(ctx context.Context, req *registrypb.UnregisterServiceRequest) (*registrypb.UnregisterServiceResponse, error) {
	return h.service.UnregisterService(req)
}

// GetService implements the GetService RPC method
func (h *RegistryHandler) GetService(ctx context.Context, req *registrypb.GetServiceRequest) (*registrypb.GetServiceResponse, error) {
	return h.service.GetService(req)
}

// ListServices implements the ListServices RPC method
func (h *RegistryHandler) ListServices(ctx context.Context, req *registrypb.ListServicesRequest) (*registrypb.ListServicesResponse, error) {
	return h.service.ListServices(req)
}

// SearchServices implements the SearchServices RPC method
func (h *RegistryHandler) SearchServices(ctx context.Context, req *registrypb.SearchServicesRequest) (*registrypb.SearchServicesResponse, error) {
	return h.service.SearchServices(req)
}