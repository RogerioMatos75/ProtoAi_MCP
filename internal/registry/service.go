package registry

import (
	pb "github.com/roger/protoai_mcp/gen/proto/protoai/v1"
	registrypb "github.com/roger/protoai_mcp/gen/proto/protoai/registry/v1"
)

// RegistryService implements the ProtoAi Registry service
type RegistryService struct {
	storage ServiceStorage
}

// NewRegistryService creates a new instance of RegistryService
func NewRegistryService(storage ServiceStorage) *RegistryService {
	return &RegistryService{
		storage: storage,
	}
}

// RegisterService registers a new service with the registry
func (s *RegistryService) RegisterService(req *registrypb.RegisterServiceRequest) (*registrypb.RegisterServiceResponse, error) {
	if req == nil || req.ServiceManifest == nil {
		return nil, ErrInvalidRequest
	}

	return s.storage.RegisterService(req.ServiceManifest)
}

// UnregisterService removes a service from the registry
func (s *RegistryService) UnregisterService(req *registrypb.UnregisterServiceRequest) (*registrypb.UnregisterServiceResponse, error) {
	if req == nil || req.ServiceId == "" {
		return nil, ErrInvalidRequest
	}

	err := s.storage.UnregisterService(req.ServiceId)
	return &registrypb.UnregisterServiceResponse{
		Success: err == nil,
	}, err
}

// GetService retrieves service information by name
func (s *RegistryService) GetService(req *registrypb.GetServiceRequest) (*registrypb.GetServiceResponse, error) {
	if req == nil || req.ServiceId == "" {
		return nil, ErrInvalidRequest
	}

	manifest, lastUpdated, err := s.storage.GetService(req.ServiceId)
	if err != nil {
		return nil, err
	}

	return &registrypb.GetServiceResponse{
		ServiceManifest: manifest,
		LastUpdated:     lastUpdated,
	}, nil
}

// ListServices returns all registered services
func (s *RegistryService) ListServices(req *registrypb.ListServicesRequest) (*registrypb.ListServicesResponse, error) {
	if req == nil {
		return nil, ErrInvalidRequest
	}

	services, nextPageToken, err := s.storage.ListServices(req.PageSize, req.PageToken)
	if err != nil {
		return nil, err
	}

	return &registrypb.ListServicesResponse{
		Services:      services,
		NextPageToken: nextPageToken,
	}, nil
}

// SearchServices searches for services based on criteria
func (s *RegistryService) SearchServices(req *registrypb.SearchServicesRequest) (*registrypb.SearchServicesResponse, error) {
	if req == nil {
		return nil, ErrInvalidRequest
	}

	matches, err := s.storage.SearchServices(req.Tags, req.NamePattern, req.DescriptionPattern)
	if err != nil {
		return nil, err
	}

	return &registrypb.SearchServicesResponse{
		MatchingServices: matches,
	}, nil
}

// ErrInvalidRequest is returned when the request is invalid
var ErrInvalidRequest = errors.New("invalid request")