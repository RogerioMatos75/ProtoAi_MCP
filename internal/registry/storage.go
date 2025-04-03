package registry

import (
	"fmt"
	"sync"
	"time"

	pb "github.com/roger/protoai_mcp/gen/proto/protoai/v1"
	registrypb "github.com/roger/protoai_mcp/gen/proto/protoai/registry/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ServiceStorage provides an interface for service registry storage operations
type ServiceStorage interface {
	RegisterService(manifest *pb.ReadmeProto) (*registrypb.RegisterServiceResponse, error)
	UnregisterService(serviceID string) error
	GetService(serviceID string) (*pb.ReadmeProto, *timestamppb.Timestamp, error)
	ListServices(pageSize int32, pageToken string) ([]*pb.ReadmeProto, string, error)
	SearchServices(tags []string, namePattern, descPattern string) ([]*pb.ReadmeProto, error)
}

// InMemoryStorage implements ServiceStorage using in-memory storage
type InMemoryStorage struct {
	mu       sync.RWMutex
	services map[string]*serviceEntry
}

type serviceEntry struct {
	manifest    *pb.ReadmeProto
	lastUpdated time.Time
}

// NewInMemoryStorage creates a new instance of InMemoryStorage
func NewInMemoryStorage() *InMemoryStorage {
	return &InMemoryStorage{
		services: make(map[string]*serviceEntry),
	}
}

// RegisterService registers a new service with the storage
func (s *InMemoryStorage) RegisterService(manifest *pb.ReadmeProto) (*registrypb.RegisterServiceResponse, error) {
	if manifest == nil || manifest.ProjectInfo == nil || manifest.ProjectInfo.Name == "" {
		return nil, fmt.Errorf("invalid manifest: missing required fields")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	serviceID := manifest.ProjectInfo.Name
	s.services[serviceID] = &serviceEntry{
		manifest:    manifest,
		lastUpdated: time.Now(),
	}

	return &registrypb.RegisterServiceResponse{
		ServiceId:         serviceID,
		RegistrationTime: timestamppb.New(time.Now()),
	}, nil
}

// UnregisterService removes a service from the storage
func (s *InMemoryStorage) UnregisterService(serviceID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.services[serviceID]; !exists {
		return fmt.Errorf("service not found: %s", serviceID)
	}

	delete(s.services, serviceID)
	return nil
}

// GetService retrieves service information by ID
func (s *InMemoryStorage) GetService(serviceID string) (*pb.ReadmeProto, *timestamppb.Timestamp, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	entry, exists := s.services[serviceID]
	if !exists {
		return nil, nil, fmt.Errorf("service not found: %s", serviceID)
	}

	return entry.manifest, timestamppb.New(entry.lastUpdated), nil
}

// ListServices returns all registered services with pagination
func (s *InMemoryStorage) ListServices(pageSize int32, pageToken string) ([]*pb.ReadmeProto, string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Simple implementation without actual pagination for now
	var services []*pb.ReadmeProto
	for _, entry := range s.services {
		services = append(services, entry.manifest)
	}

	return services, "", nil
}

// SearchServices searches for services based on criteria
func (s *InMemoryStorage) SearchServices(tags []string, namePattern, descPattern string) ([]*pb.ReadmeProto, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var matches []*pb.ReadmeProto
	for _, entry := range s.services {
		if matchesSearchCriteria(entry.manifest, tags, namePattern, descPattern) {
			matches = append(matches, entry.manifest)
		}
	}

	return matches, nil
}

// matchesSearchCriteria checks if a service matches the search criteria
func matchesSearchCriteria(manifest *pb.ReadmeProto, tags []string, namePattern, descPattern string) bool {
	// Simple matching implementation
	// In a real implementation, you would want to use proper pattern matching and tag comparison
	return true // For now, return all services
}